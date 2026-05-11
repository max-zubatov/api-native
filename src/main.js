import { env } from './config/env.js';
import express from 'express';
import { HTTP_STATUS } from './enum/http-status.enum.js';
import {
  jwtVerification,
  requireAdmin,
  requireThinker,
} from './controllers/middleware/jwt.verification.js';
import * as users from './controllers/users.controller.js';
import * as thoughts from './controllers/thoughts.contorller.js';
import * as auth from './controllers/auth.controller.js';

const app = express();
app.use(express.json());

app.post('/sign-up', auth.signUp);
app.post('/login', auth.login);
app.post('/set-password', auth.setPassword);

app.post('/users', jwtVerification, requireAdmin, users.createUser);
app.get('/users', jwtVerification, users.getUsers);
app.get('/users/:id', jwtVerification, users.getUser);
app.put('/users/:id', jwtVerification, users.updateUser);
app.delete('/users/:id', jwtVerification, requireAdmin, users.deleteUser);

app.post('/thoughts', jwtVerification, requireThinker, thoughts.createThought);
app.get('/thoughts', jwtVerification, thoughts.getThoughts);
app.get('/thoughts/:id', jwtVerification, thoughts.getThought);
app.put('/thoughts/:id', jwtVerification, requireAdmin, thoughts.updateThought);
app.post('/thoughts/:id/react', jwtVerification, requireThinker, thoughts.reactToThought);
app.delete('/thoughts/:id', jwtVerification, thoughts.deleteThought);

app.use((err, req, res, next) => {
  res.status(err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: err.message || 'Internal Server Error',
  });
});

const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
