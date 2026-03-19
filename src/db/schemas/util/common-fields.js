import * as p from 'drizzle-orm/pg-core';
export const utilCommonFields = {
  id: p.integer().primaryKey().generatedAlwaysAsIdentity(),
  createdAt: p.timestamp('created_at').notNull().defaultNow(),
  updatedAt: p.timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
};

export const utilSoftDeleteFields = {
  deletedAt: p.timestamp('deleted_at').nullable().defultNull(),
};
