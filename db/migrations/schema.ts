import { pgTable, serial, varchar, text, boolean, json, timestamp, integer, unique, uuid, foreignKey, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const resumes = pgTable("resumes", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	fileUrl: varchar("file_url", { length: 512 }).notNull(),
	fileType: varchar("file_type", { length: 50 }).notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
	parsedContent: json("parsed_content"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const customResumes = pgTable("custom_resumes", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	originalResumeId: integer("original_resume_id").notNull(),
	applicationId: integer("application_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	fileUrl: varchar("file_url", { length: 512 }).notNull(),
	customizations: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clerkId: varchar("clerk_id", { length: 255 }).notNull(),
	email: varchar({ length: 255 }),
	firstName: varchar("first_name", { length: 255 }),
	lastName: varchar("last_name", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_clerk_id_unique").on(table.clerkId),
]);

export const subscriptions = pgTable("subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	subscriptionId: varchar("subscription_id", { length: 255 }).notNull(),
	userId: varchar("user_id", { length: 255 }),
	status: varchar({ length: 50 }).notNull(),
	planId: varchar("plan_id", { length: 255 }).notNull(),
	currentPeriodEnd: timestamp("current_period_end", { mode: 'string' }),
	cancelAt: timestamp("cancel_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.clerkId],
			name: "subscriptions_user_id_users_clerk_id_fk"
		}),
	unique("subscriptions_subscription_id_unique").on(table.subscriptionId),
]);

export const applications = pgTable("applications", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	companyName: varchar("company_name", { length: 255 }).notNull(),
	jobTitle: varchar("job_title", { length: 255 }).notNull(),
	date: timestamp({ mode: 'string' }).defaultNow().notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	email: varchar({ length: 255 }).notNull(),
	amount: integer().notNull(),
	notes: text(),
	favorite: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const subscriptionPayments = pgTable("subscription_payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	subscriptionId: varchar("subscription_id", { length: 255 }),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	currency: varchar({ length: 10 }).notNull(),
	status: varchar({ length: 50 }).notNull(),
	paymentDate: timestamp("payment_date", { mode: 'string' }).notNull(),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.subscriptionId],
			foreignColumns: [subscriptions.subscriptionId],
			name: "subscription_payments_subscription_id_subscriptions_subscriptio"
		}),
]);
