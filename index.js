import http from 'http';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { query } from './setup-database.js';
import { STATUS } from './config.js';
import { EMAIL_REGEX, UUID_REGEX } from './validations.js';

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Check if user data is valid
function validateUser(user) {
  const errors = [];

  if (!user.name || !user.name.trim()) {
    errors.push('Name is required');
  }

  if (!user.password || !user.password.trim()) {
    errors.push('Password is required');
  }

  if (!user.email) {
    errors.push('Email is required');
  } else if (!EMAIL_REGEX.test(user.email)) {
    errors.push('Email is not valid');
  }

  // use negation
  if (!user.age) {
    errors.push('Age is required');
  } else if (typeof user.age !== 'number') {
    errors.push('Age must be a number');
  } else if (user.age < 0 || user.age > 150) {
    errors.push('Age must be a number between 0 and 150');
  }

  return errors;
}
// Check if the email is already in the database
async function checkEmailExists(email) {
  const emailCheckSql = 'SELECT id FROM users WHERE email = $1;';
  const emailCheckResult = await query(emailCheckSql, [email.toLowerCase()]);
  return emailCheckResult.rows.length > 0;
}
//POST
function createUser(req, res) {
  let body = '';

  // Collect data chunks
  req.on('data', chunk => {
    body += chunk;
  });

  // When all data is received
  req.on('end', async () => {
    // Parse the data
    const data = body ? JSON.parse(body) : {};

    // Check if data is valid
    const errors = validateUser(data);
    if (errors.length > 0) {
      return sendJSON(res, STATUS.BAD_REQUEST, {
        error: 'Validation failed',
        details: errors,
      });
    }
    // Check if the email is already in the database
    const emailExists = await checkEmailExists(data.email);
    if (emailExists) {
      return sendJSON(res, STATUS.BAD_REQUEST, {
        error: 'Email already exists',
        details: 'The email is already in use',
      });
    }

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(data.password, 10);

    const sql = `
        INSERT INTO users (id, name, password, email, age, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, name, email, age, created_at, updated_at;
      `;

    const result = await query(sql, [
      id,
      data.name.trim(),
      passwordHash,
      data.email.toLowerCase(),
      data.age,
      new Date().toISOString(),
      new Date().toISOString(),
    ]);

    // Send back the new user
    sendJSON(res, STATUS.CREATED, result.rows[0]);
  });
}

// GET all users
async function listUsers(req, res) {
  const sql =
    'SELECT id, name, email, age, created_at, updated_at FROM users ORDER BY created_at DESC;';
  const result = await query(sql);

  sendJSON(res, STATUS.OK, {
    count: result.rows.length,
    users: result.rows,
  });
}

// GET/{id} one user
async function getUser(req, res, id) {
  // Check if id valid and user exists
  if (!UUID_REGEX.test(id)) {
    return sendJSON(res, STATUS.BAD_REQUEST, { error: 'Invalid ID' });
  }
  const sql = `SELECT id, name, email, age, created_at, updated_at FROM users WHERE id = $1;`;
  const result = await query(sql, [id]);

  if (!result.rows.length) {
    return sendJSON(res, STATUS.NOT_FOUND, { error: 'User not found' });
  }

  // Send back the user
  sendJSON(res, STATUS.OK, result.rows[0]);
}

async function updateUser(req, res, id) {
  // Check if id valid and user exists
  if (!UUID_REGEX.test(id)) {
    return sendJSON(res, STATUS.BAD_REQUEST, { error: 'Invalid ID' });
  }

  let body = '';

  // Collect data chunks
  req.on('data', chunk => {
    body += chunk;
  });
  // When all data is received
  req.on('end', async () => {
    // Parse the data
    const data = body ? JSON.parse(body) : {};

    // Check if data is valid
    if (Object.keys(data).length === 0) {
      return sendJSON(res, STATUS.BAD_REQUEST, {
        error: 'Validation failed',
        details: 'No data provided',
      });
    }

    let updates = [];
    let values = [];
    let index = 1;
    // Update user
    if (data.name) {
      updates.push(`name = $${index}`);
      values.push(data.name.trim());
      index++;
    }
    if (data.email) {
      updates.push(`email = $${index}`);
      values.push(data.email.toLowerCase());
      index++;
    }
    if (data.age) {
      updates.push(`age = $${index}`);
      values.push(data.age);
      index++;
    }
    updates.push(`updated_at = $${index}`);
    values.push(new Date().toISOString());
    index++;
    values.push(id);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = '${id}' RETURNING id, name, email, age, created_at, updated_at;`;
    const result = await query(sql, values);

    if (!result.rows.length) {
      return sendJSON(res, STATUS.NOT_FOUND, { error: 'User not found' });
    }
    // Send back the updated user
    sendJSON(res, STATUS.OK, result.rows[0]);
  });
}

// DELETE/{id} one user
async function deleteUser(req, res, id) {
  // Check if id valid and user exists
  if (!UUID_REGEX.test(id)) {
    return sendJSON(res, STATUS.NOT_FOUND, { error: 'Invalid ID' });
  }
  const sql = `DELETE FROM users WHERE id = $1 RETURNING id, name, email, age, created_at, updated_at;`;
  const result = await query(sql, [id]);
  if (!result.rows.length) {
    return sendJSON(res, STATUS.NOT_FOUND, { error: 'User not found' });
  }
  // Send back the deleted user
  sendJSON(res, STATUS.NO_CONTENT, result.rows[0]);
}

// ROUTER - Decides which function to call
function handleRequest(req, res) {
  const method = req.method;
  const url = req.url;

  console.log(`${method} ${url}`);

  // POST /users - Create user
  if (method === 'POST' && url === '/users') {
    return createUser(req, res);
  }

  // GET /users - List users
  if (method === 'GET' && url === '/users') {
    return listUsers(req, res);
  }

  // Check if URL is /users/something
  if (url.startsWith('/users/')) {
    const id = url.split('/')[2]; // Extract the ID

    // GET /users/:id - Get user
    if (method === 'GET') {
      return getUser(req, res, id);
    }

    // PUT /users/:id - Update user
    if (method === 'PUT') {
      return updateUser(req, res, id);
    }

    // DELETE /users/:id - Delete user
    if (method === 'DELETE') {
      return deleteUser(req, res, id);
    }
  }

  // No route matched
  sendJSON(res, STATUS.NOT_FOUND, { error: 'Route is not found' });
}

// Create and start the server
const PORT = 3000;
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
