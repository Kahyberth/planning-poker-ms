import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { envs } from 'src/commons/envs';

config({ path: '.env' });

const sql = neon(envs.DATABASE_URL!);
export const db = drizzle({ client: sql });

export default db;
