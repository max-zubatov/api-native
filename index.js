import http from 'http';
import crypto from 'crypto';
import url from 'url';
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
    } else if (!(typeof str === 'string')) {
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
    req.on('end', () => {
      // Parse the data
      const data = body ? JSON.parse(body) : {};
      
      // Check if data is valid
      const errors = validateUser(data);
      if (errors.length > 0) {
        return sendJSON(res, STATUS.BAD_REQUEST, { error: 'Validation failed', details: errors });
      }
      
      // Create new user
      const id = crypto.randomUUID();
      const user = {
        id: id,
        name: data.name.trim(),
        email: data.email.toLowerCase(),
        age: data.age,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save user
      users.set(id, user);
      
      // Send back the new user
      sendJSON(res, STATUS.CREATED, user);
    });
  }

// GET/{id} one user
function listUsers(req, res) {
    const allUsers = Array.from(users.values());
    sendJSON(res, STATUS.OK, { count: allUsers.length, users: allUsers });
  }

// GET all users
function getUser(req, res, id) {
    // Check if valid id and user exists
    if (!(typeof id === 'string' && id.includes('-') && id.length >= 32)) {
        return sendJSON(res, STATUS.NOT_FOUND, { error: 'Invalid ID' });
    }
    const user = users.get(id);
    if (!user) {
      return sendJSON(res, STATUS.NOT_FOUND, { error: 'User not found' });
    }
    
    // Send back the user
    sendJSON(res, STATUS.OK, user);
  }

function updateUser(req, res, id) {
    // Check if valid id and user exists
    if (!(typeof id === 'string' && id.includes('-') && id.length >= 32)) {
        return sendJSON(res, STATUS.NOT_FOUND, { error: 'Invalid ID' });
    }

    const user = users.get(id);
    if (!user) {
      return sendJSON(res, STATUS.NOT_FOUND, { error: 'User not found' });
    }
    let body = '';
    
    // Collect data chunks
    req.on('data', chunk => {
      body += chunk;
    });
    // When all data is received
    req.on('end', () => {
      // Parse the data
      const data = body ? JSON.parse(body) : {};
      
      // Check if data is valid
      const errors = validateUser(data);
      if (errors.length > 0) {
        return sendJSON(res, STATUS.BAD_REQUEST, { error: 'Validation failed', details: errors });
      }

      // Update user
      user.name = data.name.trim();
      user.email = data.email.toLowerCase();
      user.age = data.age;
      user.updatedAt = new Date().toISOString();

      // Send back the updated user
      sendJSON(res, STATUS.OK, user);
    });
    // Update user
}

// DELETE/{id} one user
function deleteUser(req, res, id) {
    // Check if valid id and user exists
    if (!(typeof id === 'string' && id.includes('-') && id.length >= 32)) {
        return sendJSON(res, STATUS.NOT_FOUND, { error: 'Invalid ID' });
    }
    const user = users.get(id);
    if (!user) {
      return sendJSON(res, STATUS.NOT_FOUND, { error: 'User not found' });
    }
    // Delete user
    users.delete(id);

    // Send back the deleted user
    sendJSON(res, STATUS.NO_CONTENT, { message: 'User deleted successfully' });
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
  sendJSON(res, STATUS.NOT_FOUND, { error: 'Route not found' });
}

// Create and start the server
const PORT = 3000;
const server = http.createServer(handleRequest);


server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});