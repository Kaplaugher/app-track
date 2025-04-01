import { relations } from 'drizzle-orm/relations'
import { users, subscriptions, subscriptionPayments } from './schema'

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.clerkId]
  }),
  subscriptionPayments: many(subscriptionPayments)
}))

export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions)
}))

export const subscriptionPaymentsRelations = relations(subscriptionPayments, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [subscriptionPayments.subscriptionId],
    references: [subscriptions.subscriptionId]
  })
}))
