import * as p from 'drizzle-orm/pg-core';
import { usersTable } from './user-schema.js';
import { utilCommonFields } from './util/common-fields.js';
import { utilSoftDeleteFields } from './util/common-fields.js';

export const thoughtsTable = p.pgTable('thoughts', {
  ...utilCommonFields,
  ...utilSoftDeleteFields,
  title: p.varchar({ length: 255 }).notNull(),
  content: p.text().notNull(),
  userId: p.uuid().references(() => usersTable.id).notNull(),
});
