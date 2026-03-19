import * as p from 'drizzle-orm/pg-core';
import { usersTable } from './user-schema.js';
import { utilCommonFields } from './util/common-fields.js';
import { utilSoftDeleteFields } from './util/soft-delete-fields.js';

export const thoughtsTable = p.pgTable('thoughts', {
  ...utilCommonFields,
  ...utilSoftDeleteFields,
  title: p.varchar({ length: 255 }).notNull(),
  content: p.text().notNull(),
  userId: p
    .integer()
    .references(() => usersTable.id)
    .notNull(),
});
