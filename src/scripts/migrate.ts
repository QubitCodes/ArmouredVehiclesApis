import 'dotenv/config';
import { sequelize } from '../models'; // Import from models/index to get all init associations
import '../models/User';
import '../models/Category';
import '../models/Product';
import '../models/Cart';
import '../models/Wishlist';
import '../models/Order';
import '../models/Reference';
import '../models/AuthSession';
import '../models/OtpVerification';
import '../models/UserProfile';
import '../models/Address';
import '../models/Review';

async function migrate() {
  try {
    console.log('🔄 Starting Database Migration...');
    // In development/prototype, sync({ alter: true }) is an effective way to migrate schemas
    // For production, we would use strict umzug/sequelize-cli migrations.
    await sequelize.sync({ alter: true });
    console.log('✅ Database Migration Complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration Failed:', error);
    process.exit(1);
  }
}

migrate();
