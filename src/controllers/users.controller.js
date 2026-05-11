import { HTTP_STATUS } from '../enum/http-status.enum.js';
import { usersTable } from '../db/schemas/user-schema.js';
import { z } from 'zod';
import {
  signUpSchema,
  updateUserRequestSchema,
  userIdParamsSchema,
} from '../validations/schemas.js';

const createUserSchema = signUpSchema.extend({
  type: z.enum(['admin', 'thinker']),
});
import { and, eq, isNull } from 'drizzle-orm';
import { thoughtsTable } from '../db/schemas/thoughts-schema.js';
import { reactionsTable } from '../db/schemas/reactions-schema.js';
import { db } from '../db/schemas/db.js';
export const createUser = async (req, res, next) => {
  const { name, nickname, age, email, type } = req.body;
  const validation = createUserSchema.safeParse({ name, nickname, age, email, type });
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: validation.error.message });
  }
  try {
    const [inserted] = await db
      .insert(usersTable)
      .values({
        name: name.trim(),
        nickname: nickname.trim(),
        age,
        email: email.toLowerCase(),
        password: '',
        type: type.trim(),
      })
      .returning({
        id: usersTable.id,
        name: usersTable.name,
        nickname: usersTable.nickname,
        age: usersTable.age,
        email: usersTable.email,
        type: usersTable.type,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      });
    res.status(HTTP_STATUS.CREATED).json(inserted);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  const validation = userIdParamsSchema.safeParse(req.params);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: validation.error.message });
  }
  const { id } = validation.data;
  try {
    await db
      .update(usersTable)
      .set({ deletedAt: new Date() })
      .where(eq(usersTable.id, id))
      .returning();
    res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  const validation = userIdParamsSchema.safeParse(req.params);
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: validation.error.message });
  }
  const userId = validation.data.id;
  const activeUser = and(eq(usersTable.id, userId), isNull(usersTable.deletedAt));
  const activeThought = isNull(thoughtsTable.deletedAt);

  try {
    const [user] = await db.select().from(usersTable).where(activeUser);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
    }

    const thoughts = await db
      .select()
      .from(thoughtsTable)
      .where(and(eq(thoughtsTable.userId, userId), activeThought));

    const reactedRows = await db
      .select({ thought: thoughtsTable })
      .from(reactionsTable)
      .innerJoin(thoughtsTable, eq(reactionsTable.thoughtId, thoughtsTable.id))
      .where(and(eq(reactionsTable.thinkerId, userId), activeThought));

    res.status(HTTP_STATUS.OK).json({
      user,
      thoughts,
      reactedRows,
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await db.select().from(usersTable).where(isNull(usersTable.deletedAt));
    res.status(HTTP_STATUS.OK).json(users);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  const validation = updateUserRequestSchema.safeParse({ ...req.body, ...req.params });
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: validation.error.message });
  }
  const { id: userId, name, nickname, age, email } = validation.data;

  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    const existing = rows[0];
    if (!existing || existing.deletedAt) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'User not found' });
    }

    const updates = {};
    if (name !== undefined) {
      updates.name = name;
    }
    if (nickname !== undefined) {
      updates.nickname = nickname;
    }
    if (age !== undefined) {
      updates.age = age;
    }
    if (email !== undefined) {
      updates.email = email;
    }

    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, userId))
      .returning();
    res.status(HTTP_STATUS.OK).json(updated);
  } catch (error) {
    next(error);
  }
};
