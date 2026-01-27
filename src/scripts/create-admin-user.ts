
import 'dotenv/config';
import { User } from '../models';
import { sequelize } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const PASSWORD_HASH = '$2b$10$P.wO.wW/t.wO.wW/t.wO.wW/t.wO.wW/t.wO.wW/t.wO.wW/t.wO.w'; // password123

async function createAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    const admin = await User.create({
      id: uuidv4(),
      name: 'Regular Admin',
      username: 'admin_user',
      email: 'admin@demo.com',
      password: PASSWORD_HASH,
      user_type: 'admin', // Regular admin
      email_verified: true,
      is_active: true
    });

    console.log('Admin user created:', admin.toJSON());

  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await sequelize.close();
  }
}

createAdmin();
