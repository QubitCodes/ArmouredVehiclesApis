
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function resetDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB. Dropping public schema...');
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    console.log('✅ Schema reset.');
  } catch (err) {
    console.error('Reset failed:', err);
  } finally {
    await client.end();
  }
}
resetDb();
