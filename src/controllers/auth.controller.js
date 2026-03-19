import { drizzle } from 'drizzle-orm/node-postgres';
import { usersTable } from '../db/schemas/user-schema.js';
import { eq } from 'drizzle-orm';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { signUpSchema, setPasswordSchema } from '../validations/schemas.js';
import jwt from 'jsonwebtoken';

const db = drizzle(process.env.DATABASE_URL);

export const signUp = async (req, res, next) => {
  try {
    const { name, nickname, age, email } = req.body;
    const validation = signUpSchema.safeParse({ name, nickname, age, email });
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.message });
    }

    // Insert new thinker (password set to empty string since it's required but not available)
    const [newUser] = await db
      .insert(usersTable)
      .values({
        name: name.trim(),
        nickname: nickname.trim(),
        age,
        email: email.toLowerCase(),
        password: '', // Password not available for sign-up
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

    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
};

export const setPassword = async (req, res, next) => {
  try {
    const { email, password, passwordConfirmation } = req.body;
    const validation = setPasswordSchema.safeParse({ email, password, passwordConfirmation });
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.message });
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

    res.status(200).json(updatedUser);
  } catch (error) {
    return next(new Error('Failed to set password'));
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);
    if (user.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const isPasswordValid = await bcrypt.compare(password, user[0].password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user[0].id, type: user[0].type }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    return next(new Error('Failed to login'));
  }
};
