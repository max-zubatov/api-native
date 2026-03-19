import express from 'express';
import 'dotenv/config';
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
app.post('/thoughts/:id/react', jwtVerification, thoughts.reactToThought);
app.delete('/thoughts/:id', jwtVerification, thoughts.deleteThought);

// Express requires 4 args to treat this as an error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
