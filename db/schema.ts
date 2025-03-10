import {
  pgTable,
  serial,
  varchar,
  timestamp,
  text,
  boolean,
  integer
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

export type Application = typeof applications.$inferSelect
export type NewApplication = typeof applications.$inferInsert
