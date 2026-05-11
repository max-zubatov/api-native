import 'dotenv/config';

/** @type {import('drizzle-kit').Config} */
export default {
  dialect: 'postgresql',
  schema: './src/db/schemas/*.js',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
