import http from 'http';
import crypto from 'crypto';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { query } from './setup-database.js';

dotenv.config();
// My users' database
const users = new Map();


// Constants for HTTP status codes
const STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};


function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }
  
//STEP 2: VALIDATION FUNCTIONS
  // Check if user data is valid
  function validateUser(user) {
    const errors = [];
    
    if (!user.name || user.name.trim() === '') {
      errors.push('Name is required');
    }
    
    if (!user.email) {
      errors.push('Email is required');

    } else if (!(typeof user.email === 'string' && user.email.includes('@'))) {
      errors.push('Email is not valid');
    }
    
    if (user.age === undefined) {
      errors.push('Age is required');
    } else if (typeof user.age !== 'number' || user.age < 0 || user.age > 150) {
      errors.push('Age must be a number between 0 and 150');
    }
    
    return errors;
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
        return sendJSON(res, STATUS.BAD_REQUEST, { error: 'Validation failed', details: errors });
      }
      const id = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(data.password, 10);

      const sql = `
        INSERT INTO users (id, name, password, email, age, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, name, password, email, age, created_at, updated_at;
      `;

      const result = await query(sql, [
        id,
        data.name.trim(),
        passwordHash,
        data.email.toLowerCase(),
        data.age,
        new Date().toISOString(),
        new Date().toISOString()
      ]);
      
      // Send back the new user
      sendJSON(res, STATUS.CREATED, result.rows[0]);
    });
  }

// GET all users
async function listUsers(req, res) {
  const sql = 'SELECT id, name, email, age, created_at, updated_at FROM users ORDER BY created_at DESC;';
  const result = await query(sql);
  
  sendJSON(res, STATUS.OK, {
    count: result.rows.length,
    users: result.rows
  });
}

// GET/{id} one user
async function getUser(req, res, id) {
    // Check if valid id and user exists
    if (!(typeof id === 'string' && id.includes('-') && id.length >= 32)) {
        return sendJSON(res, STATUS.NOT_FOUND, { error: 'Invalid ID' });
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
    // Check if valid id and user exists
    if (!(typeof id === 'string' && id.includes('-') && id.length >= 32)) {
        return sendJSON(res, STATUS.NOT_FOUND, { error: 'Invalid ID' });
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
      if (data == {}) {
        return sendJSON(res, STATUS.BAD_REQUEST, { error: 'Validation failed', details: 'No data provided' });
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
      sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${index} RETURNING id, name, email, age, created_at, updated_at;`;
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
    // Check if valid id and user exists
    if (!(typeof id === 'string' && id.includes('-') && id.length >= 32)) {
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
    const id = url.split('/')[2];  // Extract the ID
    
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

