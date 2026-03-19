import * as p from 'drizzle-orm/pg-core';
import { utilCommonFields } from './util/common-fields.js';
import { utilSoftDeleteFields } from './util/common-fields.js';

export const usersTable = p.pgTable('users', {
  ...utilCommonFields,
  ...utilSoftDeleteFields,
  name: p.varchar({ length: 255 }).notNull(),
  nickname: p.varchar({ length: 255 }).notNull(),
  age: p.integer().notNull(),
  email: p.varchar({ length: 255 }).notNull().unique(),
  password: p.varchar({ length: 255 }).notNull().min(8),
  type: p.varchar({ length: 8, enum: ['admin', 'thinker'] }).notNull(),
});
