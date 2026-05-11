import { z } from 'zod';

export const userIdParamsSchema = z.object({
  id: z.uuid(),
});

export const signUpSchema = z.object({
  name: z.string().min(3),
  nickname: z.string().min(3),
  age: z.number().min(0).max(100),
  email: z.email(),
});

// All fields optional so PUT /users/:id can do partial updates
export const updateUserRequestSchema = z.object({
  id: z.uuid(),
  name: z.string().min(3).optional(),
  nickname: z.string().min(3).optional(),
  age: z.number().min(0).max(100).optional(),
  email: z.email().optional(),
});

// Refine lives on the *object*, not on a single field string
export const setPasswordSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8),
    passwordConfirmation: z.string().min(8),
  })
  .refine(data => data.password === data.passwordConfirmation, {
    message: 'Passwords do not match',
    path: ['passwordConfirmation'],
  });

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// userId comes from the JWT – no need to require it in the body
export const thoughtSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(3),
});

export const updateThoughtSchema = z.object({
  title: z.string().min(3).optional(),
  content: z.string().min(3).optional(),
});

// thoughtId and thinkerId come from params / JWT – only validate the body field
export const reactionSchema = z.object({
  type: z.enum(['like', 'dislike']),
});
