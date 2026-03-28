import { drizzle } from 'drizzle-orm/node-postgres';
import { usersTable } from '../db/schemas/user-schema.js';
import 'dotenv/config';
import { signUpSchema } from '../validations/schemas.js';
import { and, eq, isNull } from 'drizzle-orm';
import { thoughtsTable } from '../db/schemas/thoughts-schema.js';
import { reactionsTable } from '../db/schemas/reactions-schema.js';
import { randomUUID } from 'node:crypto';

const db = drizzle(process.env.DATABASE_URL);

export const createUser = async (req, res, next) => {
  const { name, nickname, age, email } = req.body;
  const validation = signUpSchema.safeParse({ name, nickname, age, email });
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.message });
  }
  const id = randomUUID();
  try {
    const [inserted] = await db
      .insert(usersTable)
      .values({
        id,
        name: name.trim(),
        nickname: nickname.trim(),
        age,
        email: email.toLowerCase(),
        password: '',
        type: 'thinker',
      })
      .returning();
    res.status(201).json(inserted);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  const { id } = req.params;
  try {
    await db
      .update(usersTable)
      .set({ deletedAt: new Date() })
      .where(eq(usersTable.id, id))
      .returning();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  const userId = req.params.id;
  const activeUser = and(eq(usersTable.id, userId), isNull(usersTable.deletedAt));
  const activeThought = isNull(thoughtsTable.deletedAt);

  try {
    const [user] = await db.select().from(usersTable).where(activeUser);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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

    res.status(200).json({
      user,
      thoughts,
      reactedThoughts: reactedRows.map(row => row.thought),
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await db.select().from(usersTable).where(isNull(usersTable.deletedAt));
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  const { id } = req.params;
  const { name, nickname, age, email } = req.body;
  const userId = id;
  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    const existing = rows[0];
    if (!existing || existing.deletedAt) {
      return res.status(404).json({ error: 'User not found' });
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

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};
