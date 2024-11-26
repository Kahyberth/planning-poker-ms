import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

config({ path: '.env' });

export default defineConfig({
  schema: './src/db/schema',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
