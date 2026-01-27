

import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from cwd
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function listTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB.');
    
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    const tables = res.rows.map(r => r.table_name);
    console.log('Tables found:', tables);
    
    if (tables.length <= 1 && tables.includes('SequelizeMeta')) {
        console.log('CONFIRMED: Only SequelizeMeta exists.');
    } else {
        console.log('Other tables exist.');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

listTables();

