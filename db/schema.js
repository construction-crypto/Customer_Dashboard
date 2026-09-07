import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  clientName: text('client_name'),
  clientEmail: text('client_email'),
  clientToken: text('client_token').unique(),
  currentPhase: text('current_phase'),
  progress: integer('progress'),
  cureStatus: text('cure_status'),
  createdAt: timestamp('created_at').defaultNow()
});
