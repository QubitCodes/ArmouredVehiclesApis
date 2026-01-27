
import 'dotenv/config';
import { sequelize } from '../config/database';
import { DataTypes } from 'sequelize';

// Import the migration file directly
// Note: Since it uses module.exports, we use require
const migration = require('../migrations/20260119200000-create-permissions-tables');

async function runMigration() {
  try {
    console.log('🔄 Connecting to Database...');
    await sequelize.authenticate();
    console.log('✅ Connected');

    const queryInterface = sequelize.getQueryInterface();

    console.log('🚀 Running Migration: Create Permissions Tables...');
    await migration.up(queryInterface, DataTypes);
    console.log('✅ Migration Executed Successfully');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigration();
