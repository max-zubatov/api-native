import { Pool } from 'pg';
import dotenv from 'dotenv'; // remove dotenv and use --env-file
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
dirname(__filename);

dotenv.config();

const pool = new Pool({
  user: 'myuser', // replace with env vars
  password: 'mypassword',
  host: 'localhost',
  database: 'mydatabase',
  port: 5432,
});

const dropTable = `DROP TABLE IF EXISTS users;`; // remove

// SQL command to create the users table
const createTableQuery = `
  CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL DEFAULT '',
    email VARCHAR(255) UNIQUE NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 0 AND age <= 150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`; // remove and use DB manager to create and manage db resource

async function setup() {
  // remove
  try {
    await pool.query(dropTable); // remove
    await pool.query(createTableQuery); // remove
    console.log('Table created!');
  } catch (error) {
    console.error('Error creating table:', error);
    throw error;
  }
}

// Only run setup if this file is executed directly (not imported)
const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

// remove below
if (isMainModule) {
  setup()
    .then(() => {
      pool.end();
      process.exit(0);
    })
    .catch(error => {
      console.error('Setup failed:', error);
      pool.end();
      process.exit(1);
    });
}

// remove
export { setup };

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}
