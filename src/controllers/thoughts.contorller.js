import { drizzle } from 'drizzle-orm/node-postgres';
import { thoughtsTable } from '../db/schemas/thoughts-schema.js';
import { usersTable } from '../db/schemas/user-schema.js';
import { reactionsTable } from '../db/schemas/reactions-schema.js';
import 'dotenv/config';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

const db = drizzle(process.env.DATABASE_URL);

export const createThought = async (req, res, next) => {
  const { title, content } = req.body;
  if (req.user?.type !== 'thinker') {
    return res.status(403).json({ error: 'Only thinkers can create thoughts' });
  }
  const id = randomUUID();
  try {
    const [thought] = await db
      .insert(thoughtsTable)
      .values({ id, title, content, userId: req.user.userId })
      .returning({
        id: thoughtsTable.id,
        title: thoughtsTable.title,
        content: thoughtsTable.content,
        userId: thoughtsTable.userId,
        createdAt: thoughtsTable.createdAt,
        updatedAt: thoughtsTable.updatedAt,
      });
    res.status(201).json(thought);
  } catch (error) {
    next(error);
  }
};

export const deleteThought = async (req, res, next) => {
  const thoughtId = req.params.id;
  const { type, userId } = req.user;

  try {
    const [thought] = await db.select().from(thoughtsTable).where(eq(thoughtsTable.id, thoughtId));
    if (!thought || thought.deletedAt) {
      return res.status(404).json({ error: 'Thought not found' });
    }
    const [updated] = await db
      .update(thoughtsTable)
      .set({ deletedAt: new Date() })
      .where(
        type === 'admin'
          ? eq(thoughtsTable.id, thoughtId)
          : and(eq(thoughtsTable.id, thoughtId), eq(thoughtsTable.userId, userId))
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Thought not found' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getThought = async (req, res, next) => {
  const thoughtId = req.params.id;
  try {
    // thoughts → users (owner) → reactions (aggregate likes / dislikes)
    const [row] = await db
      .select({
        thought: thoughtsTable,
        owner: usersTable,
        likesCount:
          sql`coalesce(count(${reactionsTable.id}) filter (where ${reactionsTable.type} = 'like'), 0)::int`.mapWith(
            Number
          ),
        dislikesCount:
          sql`coalesce(count(${reactionsTable.id}) filter (where ${reactionsTable.type} = 'dislike'), 0)::int`.mapWith(
            Number
          ),
      })
      .from(thoughtsTable)
      .innerJoin(usersTable, eq(thoughtsTable.userId, usersTable.id))
      .leftJoin(reactionsTable, eq(reactionsTable.thoughtId, thoughtsTable.id))
      .where(
        and(
          eq(thoughtsTable.id, thoughtId),
          isNull(thoughtsTable.deletedAt),
          isNull(usersTable.deletedAt)
        )
      )
      .groupBy(thoughtsTable.id, usersTable.id);

    if (!row) {
      return res.status(404).json({ error: 'Thought not found' });
    }

    res.status(200).json({
      thought: row.thought,
      owner: row.owner,
      likesCount: row.likesCount,
      dislikesCount: row.dislikesCount,
    });
  } catch (error) {
    next(error);
  }
};

export const getThoughts = async (req, res, next) => {
  try {
    const thoughts = await db.select().from(thoughtsTable);
    res.status(200).json(thoughts);
  } catch (error) {
    next(error);
  }
};

export const updateThought = async (req, res, next) => {
  const { id } = req.params;
  const { title, content } = req.body;
  try {
    const thoughtId = id;
    const [thought] = await db
      .update(thoughtsTable)
      .set({ title, content })
      .where(and(eq(thoughtsTable.id, thoughtId), isNull(thoughtsTable.deletedAt)))
      .returning();
    if (!thought) {
      return res.status(404).json({ error: 'Thought not found' });
    }
    res.status(200).json(thought);
  } catch (error) {
    next(error);
  }
};

export const reactToThought = async (req, res, next) => {
  const thoughtId = req.params.id;
  const { type } = req.body;
  try {
    const id = randomUUID();
    const [reaction] = await db
      .insert(reactionsTable)
      .values({ id, thoughtId, type, thinkerId: req.user.userId })
      .returning();
    if (!reaction) {
      return res.status(404).json({ error: 'Thought not found' });
    }
    res.status(201).json(reaction);
  } catch (error) {
    next(error);
  }
};
