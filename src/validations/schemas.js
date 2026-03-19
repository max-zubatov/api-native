import { z } from 'zod';

export const userSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    deletedAt: z.date().nullable(),
    name: z.string().min(3),
    nickname: z.string().min(3),
    age: z.number().min(0).max(150),
    email: z.email(),
    password: z.string().min(8).optional,
    type: z.enum(['admin', 'thinker']),
});

export const thoughtSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    deletedAt: z.date().nullable(),
    title: z.string().min(3),
    content: z.string().min(10),
});

export const reactionSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    deletedAt: z.date().nullable(),
    type: z.enum(['like', 'dislike']),
    thinkerId: z.uuid(),
});

export const signUpSchema = z.object({
    name: z.string().min(3),
    nickname: z.string().min(3),
    age: z.number().min(0).max(150),
    email: z.email(),
});

export const setPasswordSchema = z.object({
    email: z.email(),
    password: z.string().min(8),
    passwordConfirmation: z.string().min(8).refine((data) => data.password === data.passwordConfirmation, {
        message: 'Passwords do not match',
    }),
});