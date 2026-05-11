import * as p from 'drizzle-orm/pg-core';
export const utilCommonFields = {
  id: p.uuid('id').primaryKey().defaultRandom(),
  createdAt: p.timestamp('createdAt').notNull().defaultNow(),
  updatedAt: p.timestamp('updatedAt').notNull().defaultNow().$onUpdate(() => new Date()),
};

export const utilSoftDeleteFields = {
  deletedAt: p.timestamp('deletedAt'),
};
