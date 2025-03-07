import {
  pgTable,
  serial,
  varchar,
  timestamp,
  decimal,
  text
} from 'drizzle-orm/pg-core'

export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  date: timestamp('date').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  email: varchar('email', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export type Application = typeof applications.$inferSelect
export type NewApplication = typeof applications.$inferInsert
