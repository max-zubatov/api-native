import { HTTP_STATUS } from '../enum/http-status.enum.js';
import { thoughtsTable } from '../db/schemas/thoughts-schema.js';
import { usersTable } from '../db/schemas/user-schema.js';
import { reactionsTable } from '../db/schemas/reactions-schema.js';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { reactionSchema, thoughtSchema, updateThoughtSchema } from '../validations/schemas.js';
import { db } from '../db/schemas/db.js';

export const createThought = async (req, res, next) => {
  const { title, content } = req.body;
  const validation = thoughtSchema.safeParse({ title, content });
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: validation.error.message });
  }
  // userId always comes from the verified JWT – never trust the request body
  const userId = req.user.userId;
  try {
    const [thought] = await db
      .insert(thoughtsTable)
      .values({ title, content, userId })
      .returning({
        id: thoughtsTable.id,
        title: thoughtsTable.title,
        content: thoughtsTable.content,
        userId: thoughtsTable.userId,
        createdAt: thoughtsTable.createdAt,
        updatedAt: thoughtsTable.updatedAt,
      });
    res.status(HTTP_STATUS.CREATED).json(thought);
  } catch (error) {
    next(error);
  }
};

export const deleteThought = async (req, res, next) => {
  const thoughtId = req.params.id;
  const { type, userId } = req.user;

  try {
    const whereClause =
      type === 'admin'
        ? and(eq(thoughtsTable.id, thoughtId), isNull(thoughtsTable.deletedAt))
        : and(
            eq(thoughtsTable.id, thoughtId),
            eq(thoughtsTable.userId, userId),
            isNull(thoughtsTable.deletedAt)
          );

    const [updated] = await db
      .update(thoughtsTable)
      .set({ deletedAt: new Date() })
      .where(whereClause)
      .returning();

    if (!updated) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Thought not found' });
    }
    res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

export const getThought = async (req, res, next) => {
  const thoughtId = req.params.id;
  try {
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
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Thought not found' });
    }

    res.status(HTTP_STATUS.OK).json({
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
    // Only return non-deleted thoughts
    const thoughts = await db
      .select()
      .from(thoughtsTable)
      .where(isNull(thoughtsTable.deletedAt));
    res.status(HTTP_STATUS.OK).json(thoughts);
  } catch (error) {
    next(error);
  }
};

export const updateThought = async (req, res, next) => {
  const { id } = req.params;
  const { title, content } = req.body;
  const validation = updateThoughtSchema.safeParse({ title, content });
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: validation.error.message });
  }
  try {
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;

    const [thought] = await db
      .update(thoughtsTable)
      .set(updates)
      .where(and(eq(thoughtsTable.id, id), isNull(thoughtsTable.deletedAt)))
      .returning();
    if (!thought) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Thought not found' });
    }
    res.status(HTTP_STATUS.OK).json(thought);
  } catch (error) {
    next(error);
  }
};

export const reactToThought = async (req, res, next) => {
  const thoughtId = req.params.id;
  // Extract from body BEFORE validation so the schema can check it
  const { type } = req.body;
  const validation = reactionSchema.safeParse({ type });
  if (!validation.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: validation.error.message });
  }
  const thinkerId = req.user.userId;
  try {
    // Upsert: if the thinker already reacted to this thought, update the type
    const existing = await db
      .select()
      .from(reactionsTable)
      .where(
        and(eq(reactionsTable.thoughtId, thoughtId), eq(reactionsTable.thinkerId, thinkerId))
      )
      .limit(1);

    let reaction;
    if (existing.length > 0) {
      [reaction] = await db
        .update(reactionsTable)
        .set({ type })
        .where(
          and(eq(reactionsTable.thoughtId, thoughtId), eq(reactionsTable.thinkerId, thinkerId))
        )
        .returning();
    } else {
      [reaction] = await db
        .insert(reactionsTable)
        .values({ thoughtId, type, thinkerId })
        .returning();
    }

    res.status(HTTP_STATUS.CREATED).json(reaction);
  } catch (error) {
    next(error);
  }
};
