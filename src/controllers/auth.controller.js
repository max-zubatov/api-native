import { HTTP_STATUS } from '../enum/http-status.enum.js';
import { usersTable } from '../db/schemas/user-schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { env } from '../config/env.js';
import { signUpSchema, setPasswordSchema, loginSchema } from '../validations/schemas.js';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { db } from '../db/schemas/db.js';

export const signUp = async (req, res, next) => {
  try {
    const { name, nickname, age, email } = req.body;
    const validation = signUpSchema.safeParse({ name, nickname, age, email });
    if (!validation.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: validation.error.message });
    }
    const id = randomUUID();
    const [newUser] = await db
      .insert(usersTable)
      .values({
        id,
        name: name.trim(),
        nickname: nickname.trim(),
        age: age,
        email: email.toLowerCase(),
        password: '',
        type: 'thinker',
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

    res.status(HTTP_STATUS.CREATED).json(newUser);
  } catch (error) {
    next(error);
  }
};

export const setPassword = async (req, res, next) => {
  try {
    const { email, password, passwordConfirmation } = req.body;
    const validation = setPasswordSchema.safeParse({ email, password, passwordConfirmation });
    if (!validation.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: validation.error.message });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [updatedUser] = await db
      .update(usersTable)
      .set({ password: hashedPassword })
      .where(eq(usersTable.email, email.toLowerCase()))
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

    res.status(HTTP_STATUS.OK).json(updatedUser);
  } catch (error) {
    return next(new Error('Failed to set password'));
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const loginValidation = loginSchema.safeParse({ email, password });
    if (!loginValidation.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: loginValidation.error.message });
    }
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);
    if (user.length === 0) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid email or password' });
    }
    // Users who have never called /set-password have an empty password hash
    if (!user[0].password) {
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json({ error: 'Password not set. Please set your password via /set-password first.' });
    }
    const isPasswordValid = await bcrypt.compare(password, user[0].password);
    if (!isPasswordValid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user[0].id, type: user[0].type }, env.JWT_SECRET, {
      expiresIn: '1h',
    });
    res.status(HTTP_STATUS.OK).json({ token });
  } catch (error) {
    return next(new Error('Failed to login'));
  }
};
