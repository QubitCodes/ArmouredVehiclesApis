import 'dotenv/config';
import { sequelize } from '../config/database';
import { User } from '../models/User';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function seedAdmin() {
  try {
    console.log('... Seeding Admin User');


    const adminUser = {
      id: crypto.randomUUID(),
      name: 'JK Admin',
      email: 'mail@iamjk.in',
      phone: '9999988888', // Dummy unique phone
      country_code: '+91',
      username: 'jk_admin',

      user_type: 'admin', // or 'super_admin'
      email_verified: true,
      phone_verified: true,
      is_active: true,
      onboarding_step: 4
    };

    const existing = await User.findOne({ where: { email: adminUser.email } });
    if (existing) {
      console.log(`User with email ${adminUser.email} already exists.`);
      // Optional: Update to admin if existed as customer?
      if (existing.user_type !== 'admin' && existing.user_type !== 'super_admin') {
        await existing.update({ user_type: 'admin' });
        console.log(`Updated ${adminUser.email} to admin role.`);
      }
    } else {
      await User.create(adminUser as any);
      console.log(`Created Admin user: ${adminUser.name} (${adminUser.email})`);
    }

  } catch (err) {
    console.error('Seeding Admin failed:', err);
    throw err;
  }
}

// Allow standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  sequelize.authenticate().then(() => {
    seedAdmin().then(() => sequelize.close());
  });
}
