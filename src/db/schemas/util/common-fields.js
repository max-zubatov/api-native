import * as p from 'drizzle-orm/pg-core';
export const utilCommonFields = {
  id: p.uuid('id').primaryKey().defaultRandom(),
  createdAt: p.timestamp('created_at').notNull().defaultNow(),
  updatedAt: p.timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
};

export const utilSoftDeleteFields = {
  // Omit .notNull() — column is nullable (Drizzle 0.45+ has no .nullable() chain)
  deletedAt: p.timestamp('deleted_at'),
};
