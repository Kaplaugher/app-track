import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { applications } from './schema'

// Load environment variables
config()

// Sample data for realistic applications
const companies = [
  'Google', 'Microsoft', 'Apple', 'Amazon', 'Meta',
  'Netflix', 'Uber', 'Airbnb', 'Twitter', 'Stripe',
  'Shopify', 'Square', 'Dropbox', 'Slack', 'GitHub'
]

const jobTitles = [
  'Senior Software Engineer',
  'Full Stack Developer',
  'Frontend Engineer',
  'Backend Engineer',
  'DevOps Engineer',
  'Software Architect',
  'Technical Lead',
  'Product Engineer',
  'Cloud Engineer',
  'React Developer'
]

const statuses = ['pending', 'interviewing', 'rejected', 'accepted']

// Helper to get random item from array
const getRandomItem = <T>(array: readonly T[]): T => {
  if (!array.length) throw new Error('Array cannot be empty')
  return array[Math.floor(Math.random() * array.length)] as T
}

// Helper to get random amount between 80000 and 200000
const getRandomSalary = () => Math.floor(Math.random() * (200000 - 80000) + 80000)

// Helper to get random date within last 3 months
const getRandomDate = () => {
  const now = new Date()
  const threeMonthsAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000))
  return new Date(threeMonthsAgo.getTime() + Math.random() * (now.getTime() - threeMonthsAgo.getTime()))
}

async function seed() {
  // Initialize Postgres connection
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const client = postgres(process.env.DATABASE_URL)
  const db = drizzle(client)

  // Generate 15 applications
  const sampleApplications = Array.from({ length: 15 }, () => ({
    userId: 'user_2v0FGrtDBco4nuKuAanKBBY93YH', // Replace with actual user ID
    companyName: getRandomItem(companies),
    jobTitle: getRandomItem(jobTitles),
    date: getRandomDate(),
    status: getRandomItem(statuses),
    email: 'recruiter@company.com',
    amount: getRandomSalary(),
    notes: 'Sample application created by seed script',
    favorite: Math.random() > 0.8, // 20% chance of being favorited
    createdAt: new Date(),
    updatedAt: new Date()
  }))

  try {
    // Insert all applications
    const result = await db.insert(applications).values(sampleApplications)
    console.log('Successfully seeded database with 15 applications')
    console.log(result)
  } catch (error) {
    console.error('Error seeding database:', error)
  } finally {
    await client.end()
  }
}

// Run the seed function
seed().catch(console.error)
