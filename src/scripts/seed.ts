
import 'dotenv/config';
import { sequelize } from '../config/database';
import { seedReferences } from './seed-references';
import { seedPermissions } from './seed-permissions';
import { seedUsers } from './seed-users';

async function seed() {
  try {
    console.log('🌱 Starting Database Seed...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    await sequelize.sync({ alter: true }); // Ensure tables exist and match models
    console.log('✅ Database synced');

    await seedReferences();
    await seedPermissions();
    await seedUsers();

    console.log('✅ Seeding Complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
