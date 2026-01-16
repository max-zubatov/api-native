import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
const __filename = fileURLToPath(import.meta.url);
dirname(__filename);
// Load environment variables from setup.env file
// If you want to use .env instead, change to: dotenv.config();
dotenv.config({ path: './setup.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
});

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}
