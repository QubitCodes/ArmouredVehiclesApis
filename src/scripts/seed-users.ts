import 'dotenv/config';
import { sequelize } from '../config/database';
import { User } from '../models/User';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';


export async function seedUsers() {
  try {
    console.log('... Seeding Users');
    // await sequelize.authenticate(); // Handled by runner
    // await sequelize.sync(); // Handled by runner

    const passwordHash = await bcrypt.hash('password123', 10);

    const users = [
      {
        id: crypto.randomUUID(),
        name: 'Initial Customer',
        email: 'customer@example.com',
        phone: '9400143527',
        country_code: '+91',
        username: 'customer_9400',
        password: passwordHash,
        user_type: 'customer',
        email_verified: true,
        phone_verified: true,
        is_active: true,
        onboarding_step: 4
      },
      {
        id: crypto.randomUUID(),
        name: 'Initial Vendor',
        email: 'vendor@example.com',
        phone: '8281300882',
        country_code: '+91',
        username: 'vendor_8281',
        password: passwordHash,
        user_type: 'vendor',
        email_verified: true,
        phone_verified: true,
        is_active: true,
        onboarding_step: 4
      }
    ];

    for (const u of users) {
      const existing = await User.findOne({ where: { phone: u.phone } });
      if (existing) {
        console.log(`User with phone ${u.phone} already exists.`);
      } else {
        await User.create(u as any);
        console.log(`Created user: ${u.name} (${u.phone})`);
      }
    }

  } catch (err) {
    console.error('Seeding Users failed:', err);
    throw err;
  }
}

// Allow standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  sequelize.authenticate().then(() => {
    seedUsers().then(() => sequelize.close());
  });
}
