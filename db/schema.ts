import {
  pgTable,
  serial,
  varchar,
  timestamp,
  text,
  boolean,
  integer,
  json,
  decimal,
  uuid
} from 'drizzle-orm/pg-core'

export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  jobTitle: varchar('job_title', { length: 255 }).notNull(),
  date: timestamp('date').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  email: varchar('email', { length: 255 }).notNull(),
  amount: integer('amount').notNull(),
  notes: text('notes'),
  favorite: boolean('favorite').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const resumes = pgTable('resumes', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  fileUrl: varchar('file_url', { length: 512 }).notNull(), // Supabase storage URL
  fileType: varchar('file_type', { length: 50 }).notNull(), // pdf, docx, etc.
  isDefault: boolean('is_default').notNull().default(false),
  parsedContent: json('parsed_content'), // Structured content for RAG/customization
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const customResumes = pgTable('custom_resumes', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  originalResumeId: integer('original_resume_id').notNull(), // Reference to the original resume
  applicationId: integer('application_id').notNull(), // Reference to the job application
  title: varchar('title', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 512 }).notNull(), // Supabase storage URL
  customizations: json('customizations'), // What changes were made
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: varchar('clerk_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  subscriptionId: varchar('subscription_id', { length: 255 }).notNull().unique(),
  userId: varchar('user_id', { length: 255 }).references(() => users.clerkId),
  status: varchar('status', { length: 50 }).notNull(),
  planId: varchar('plan_id', { length: 255 }).notNull(),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAt: timestamp('cancel_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const subscriptionPayments = pgTable('subscription_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  subscriptionId: varchar('subscription_id', { length: 255 }).references(() => subscriptions.subscriptionId),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  paymentDate: timestamp('payment_date').notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export type Application = typeof applications.$inferSelect
export type NewApplication = typeof applications.$inferInsert

export type Resume = typeof resumes.$inferSelect
export type NewResume = typeof resumes.$inferInsert

export type CustomResume = typeof customResumes.$inferSelect
export type NewCustomResume = typeof customResumes.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert

export type SubscriptionPayment = typeof subscriptionPayments.$inferSelect
export type NewSubscriptionPayment = typeof subscriptionPayments.$inferInsert
