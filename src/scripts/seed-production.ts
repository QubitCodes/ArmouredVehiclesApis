import 'dotenv/config';
import { sequelize } from '../config/database';
import { v4 as uuidv4 } from 'uuid';



async function seedProduction() {
  const queryInterface = sequelize.getQueryInterface();
  const timestamp = new Date();

  try {
    console.log('🏭 Starting Production Seed...');
    await sequelize.authenticate();

    // --- 1. Reference Tables ---
    // Countries
    await queryInterface.bulkInsert('ref_countries', [
      { name: 'United States', code: 'US', phone_code: '+1', flag: '🇺🇸', is_active: true },
      { name: 'United Arab Emirates', code: 'AE', phone_code: '+971', flag: '🇦🇪', is_active: true },
      { name: 'United Kingdom', code: 'GB', phone_code: '+44', flag: '🇬🇧', is_active: true },
      { name: 'Saudi Arabia', code: 'SA', phone_code: '+966', flag: '🇸🇦', is_active: true },
      { name: 'Germany', code: 'DE', phone_code: '+49', flag: '🇩🇪', is_active: true },
    ]);

    // Currencies
    await queryInterface.bulkInsert('ref_currencies', [
      { name: 'UAE Dirham', code: 'AED', symbol: 'AED', is_active: true },
      { name: 'US Dollar', code: 'USD', symbol: '$', is_active: true },
      { name: 'Euro', code: 'EUR', symbol: '€', is_active: true },
    ]);

    // Business & License Types
    await queryInterface.bulkInsert('ref_license_types', [
      { name: 'General Trading', display_order: 1 },
      { name: 'Industrial License', display_order: 2 },
      { name: 'Service License', display_order: 3 },
    ]);

    await queryInterface.bulkInsert('ref_nature_of_business', [
      { name: 'Manufacturer', display_order: 1 },
      { name: 'Distributor', display_order: 2 },
      { name: 'Reseller', display_order: 3 },
    ]);

    await queryInterface.bulkInsert('ref_controlled_item_types', [
      { name: 'Dual-Use Goods', description: 'Civilian goods that can be used for military purposes' },
      { name: 'Military Goods', description: 'Goods designed specifically for military use' },
      { name: 'Not Controlled', description: 'Standard commercial goods' },
    ]);

    // --- 2. Categories ---
    // Using manual IDs to ensure relationships work
    const categories = [
      { id: 1, name: 'Automotive', slug: 'automotive', level: 0, is_active: true, created_at: timestamp, updated_at: timestamp },
      { id: 2, name: 'Armoured Vehicles', slug: 'armoured-vehicles', parent_id: 1, level: 1, is_active: true, created_at: timestamp, updated_at: timestamp },
      { id: 3, name: 'Spare Parts', slug: 'spare-parts', parent_id: 1, level: 1, is_active: true, created_at: timestamp, updated_at: timestamp },
      { id: 4, name: 'Electronics', slug: 'electronics', level: 0, is_active: true, created_at: timestamp, updated_at: timestamp },
      { id: 5, name: 'Communication Systems', slug: 'communication-systems', parent_id: 4, level: 1, is_active: true, created_at: timestamp, updated_at: timestamp },
    ];
    await queryInterface.bulkInsert('categories', categories);

    // --- 3. Platform Settings ---
    await queryInterface.bulkInsert('platform_settings', [
      { key: 'site_name', value: 'B2B Marketplace', description: 'Global Site Name', created_at: timestamp, updated_at: timestamp },
      { key: 'maintenance_mode', value: 'false', description: 'System wide maintenance mode', created_at: timestamp, updated_at: timestamp },
      { key: 'default_currency', value: 'AED', description: 'Default platform currency', created_at: timestamp, updated_at: timestamp },
      { key: 'vat_percentage', value: '5', description: 'Standard VAT Percentage', created_at: timestamp, updated_at: timestamp },
    ]);

    // --- 4. System Users (Super Admin) ---
    const superAdminId = uuidv4();

    await queryInterface.bulkInsert('users', [{
      id: superAdminId,
      name: 'System Super Admin',
      username: 'superadmin',
      email: 'admin@platform.com',

      user_type: 'super_admin',
      email_verified: true,
      phone_verified: true,
      is_active: true,
      created_at: timestamp,
      updated_at: timestamp
    }]);

    // Admin Profile (Optional but good practice)
    await queryInterface.bulkInsert('user_profiles', [{
      id: uuidv4(),
      user_id: superAdminId,
      company_name: 'Platform HQ',
      onboarding_status: 'approved',
      created_at: timestamp,
      updated_at: timestamp
    }]);

    console.log('✅ Production Seeding Complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Production Seeding Failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seedProduction();