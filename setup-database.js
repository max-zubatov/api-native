import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const pool = new Pool({
  user: 'myuser',
  host: 'localhost',
  database: 'mydatabase',
  password: 'mypassword',
  port: 5432,
});

console.log('Dropping table...');

const dropTable = `DROP TABLE users;`;
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
`;
async function setup() {
    try {
        await pool.query(createTableQuery);
        await pool.query(dropTable);
        console.log('Table created!');
    } catch (error) {
        console.error('Error creating table:', error);
        throw error;
    }
}

// Only run setup if this file is executed directly (not imported)
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
    setup().then(() => {
        pool.end();
        process.exit(0);
    }).catch((error) => {
        console.error('Setup failed:', error);
        pool.end();
        process.exit(1);
    });
}

// Export setup function so it can be called from index.js if needed
export { setup };

export async function query(text, params) {
    const result = await pool.query(text, params);
    return result;
}
  
export default pool;
