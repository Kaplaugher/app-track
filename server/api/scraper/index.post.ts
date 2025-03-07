import { ApifyClient } from 'apify-client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '~/server/database';
import { applications, type NewApplication } from '~/server/database/schema';

// Define types for the scraped data
interface ScrapedItem {
  url: string;
  text?: string;
  metadata?: {
    title?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export default defineEventHandler(async (event) => {
  try {
    // Get the request body
    const body = await readBody(event);

    // Validate the input
    if (!body.url) {
      throw createError({
        statusCode: 400,
        message: 'URL is required',
      });
    }

    // Get API tokens from runtime config
    const config = useRuntimeConfig();
    const apifyToken = config.apifyToken;
    const geminiApiKey = config.geminiApiKey;

    if (!apifyToken) {
      throw createError({
        statusCode: 500,
        message: 'Apify API token is not configured',
      });
    }

    if (!geminiApiKey) {
      throw createError({
        statusCode: 500,
        message: 'Gemini API key is not configured',
      });
    }

    // Initialize the Apify client
    const client = new ApifyClient({ token: apifyToken });

    // Prepare the input for the scraper
    const input = {
      startUrls: [{ url: body.url }],
      maxRequestsPerCrawl: body.maxRequests || 10,
      // Add any other parameters needed for the specific actor
    };

    // Run the web scraper actor
    const run = await client.actor('apify/website-content-crawler').call(input);

    // Fetch the results from the dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const scrapedItems = items as ScrapedItem[];

    console.log('Scraped items:', scrapedItems.length);

    // Initialize the Gemini model
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    // Prepare the content for Gemini
    const scrapedContent = scrapedItems[0].text;

    // Create a prompt for Gemini to extract application information
    const prompt = `
    Extract the following information from this scraped website content:
    1. Company Name
    2. Email Address
    3. Amount - this would be salary (as a positive number)
    4. Any additional notes or context

    Format the response as a JSON object with these fields:
    {
      "companyName": string,
      "email": string,
      "amount": number,
      "notes": string
    }

    If you can't find some information, make a reasonable guess based on the context or put unknown.
    For the email, if not found, use a placeholder like "contact@[companyname].com".
    For the amount, if not found, use a default value of 1000.

    Here's the content:
    ${scrapedContent}
    `;

    // Generate content with Gemini
    const result = await model.generateContent(prompt);
    const generatedText = result.response.text();

    console.log('Gemini response:', generatedText);

    // Parse the JSON response from Gemini
    let extractedData;
    try {
      // Find JSON in the response (in case there's additional text)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
        console.log('Extracted data:', extractedData);
      } else {
        throw new Error('No valid JSON found in the response');
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      throw createError({
        statusCode: 500,
        message: 'Failed to parse the AI-generated data',
      });
    }

    // Validate the extracted data
    if (
      !extractedData.companyName ||
      !extractedData.email ||
      !extractedData.amount
    ) {
      throw createError({
        statusCode: 500,
        message: 'AI could not extract all required fields',
      });
    }

    // Create a new application with the extracted data
    const newApplication: NewApplication = {
      companyName: extractedData.companyName,
      email: extractedData.email,
      status: 'pending',
      amount: String(extractedData.amount),
      notes: extractedData.notes || null,
    };

    // Insert the application into the database
    const applicationResult = await db
      .insert(applications)
      .values(newApplication)
      .returning();

    // Return both the scraped data and the created application
    return {
      success: true,
      scrapedData: scrapedItems,
      extractedData: extractedData,
      createdApplication: applicationResult[0],
    };
  } catch (error: any) {
    // Handle errors
    console.error('Scraper error:', error);

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to process the URL',
    });
  }
});
