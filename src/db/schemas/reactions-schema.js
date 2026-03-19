import * as p from 'drizzle-orm/pg-core';
import { usersTable } from './user-schema.js';
import { thoughtsTable } from './thoughts-schema.js';
import { utilCommonFields } from './util/common-fields.js';

export const reactionsTable = p.pgTable('reactions', {
  ...utilCommonFields,
  type: p.varchar({ length: 8, enum: ['like', 'dislike'] }).notNull(),
  thinkerId: p
    .integer()
    .references(() => usersTable.id)
    .notNull(),
  thoughtId: p
    .integer()
    .references(() => thoughtsTable.id)
    .notNull(),
});
