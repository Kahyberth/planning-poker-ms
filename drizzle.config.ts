import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';
import { envs } from 'src/commons/envs';

config({ path: '.env' });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: envs.DATABASE_URL!,
  },
});
