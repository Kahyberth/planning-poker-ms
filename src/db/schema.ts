import { relations } from 'drizzle-orm';
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const sessionsTable = pgTable('sessions', {
  id: text('id').primaryKey(),
  sessions_name: text('title').notNull(),
  created_at: timestamp('content').notNull(),
  updated_at: timestamp('created_at').notNull().defaultNow(),
  created_by: text('user_id').notNull(),
});

export const estimatesTable = pgTable('estimates', {
  id: text('id').primaryKey(),
  session_id: text('session_id').notNull(),
  user_id: text('user_id').notNull(),
  story_id: text('story_id').notNull(),
  estimate_value: integer('estimate').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  estimated_at: timestamp('estimated_at').notNull().defaultNow(),
});

export const storiesTable = pgTable('stories', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  session_id: text('session_id')
    .notNull()
    .references(() => sessionsTable.id),
  storie_id: text('storie_id').notNull(),
});

export const session_participantsTable = pgTable('session_participants', {
  session_id: text('session_id')
    .notNull()
    .references(() => sessionsTable.id),
  user_id: text('user_id').notNull(),
  role: text('role').notNull(),
  joined_at: timestamp('joined_at').notNull().defaultNow(),
});

// Relations between tables

export const sessionsTableRelations = relations(sessionsTable, ({ many }) => ({
  storiesTable: many(storiesTable),
}));

export const storiesTableRelations = relations(storiesTable, ({ one }) => ({
  session: one(sessionsTable, {
    fields: [storiesTable.session_id],
    references: [sessionsTable.id],
  }),
}));

export const estimatesRelations = relations(estimatesTable, ({ one }) => ({
  storie: one(storiesTable, {
    fields: [estimatesTable.story_id],
    references: [storiesTable.storie_id],
  }),
}));

export const $storiesRelations = relations(storiesTable, ({ many }) => ({
  estimates: many(estimatesTable),
}));

export const $sessionsTableRelations = relations(sessionsTable, ({ many }) => ({
  estimates: many(estimatesTable),
}));

export const $estimatesRelations = relations(estimatesTable, ({ one }) => ({
  sessions: one(sessionsTable, {
    fields: [estimatesTable.session_id],
    references: [sessionsTable.id],
  }),
}));

export const $sessionParticipantsRelations = relations(
  session_participantsTable,
  ({ one }) => ({
    session: one(sessionsTable, {
      fields: [session_participantsTable.session_id],
      references: [sessionsTable.id],
    }),
  }),
);

// Types
export type InsertUser = typeof sessionsTable.$inferInsert;
export type SelectUser = typeof sessionsTable.$inferSelect;

export type InsertEstimate = typeof estimatesTable.$inferInsert;
export type SelectEstimate = typeof estimatesTable.$inferSelect;

export type InsertStory = typeof storiesTable.$inferInsert;
export type SelectStory = typeof storiesTable.$inferSelect;

export type InsertSessionParticipant =
  typeof session_participantsTable.$inferInsert;
export type SelectSessionParticipant =
  typeof session_participantsTable.$inferSelect;
