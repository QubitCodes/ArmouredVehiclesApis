import 'dotenv/config';
import { sequelize } from '../models'; // Imports index which imports all models

async function forceSync() {
  try {
    console.log('☢️ Force Syncing Database (Dropping all tables)...');
    await sequelize.sync({ force: true });
    console.log('✅ Database Force Sync Complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Force Sync Failed:', error);
    process.exit(1);
  }
}

forceSync();
