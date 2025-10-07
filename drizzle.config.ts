/*
Drizzle + DB  setup 

Loads drizzle-kit’s Config type and calls dotenv.config() so variables in your .env 
file become available on process.env (e.g. DATABASE_URL).

schema: path to your Drizzle table definitions (schema.ts). 
The CLI reads this file to infer SQL and types.

out: the directory where the CLI writes migration files and generated artifacts 
(you’ll see SQL files under ./drizzle).

driver: 'pg': you’re targeting PostgreSQL.
dbCredentials.connectionString: database connection string pulled from the environment (.env’s DATABASE_URL).
*/

import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  schema: './src/infrastructure/database/models/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
