import 'dotenv/config';
import { sequelize } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// Default password hash for 'password123'
const PASSWORD_HASH = '$2b$10$P.wO.wW/t.wO.wW/t.wO.wW/t.wO.wW/t.wO.wW/t.wO.wW/t.wO.w'; 
const timestamp = new Date();

async function seedDummyData() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('🚀 Starting Dummy Data Seeder...');
    await sequelize.authenticate();
    
    // --- PART 1: SYSTEM SETUP (Ref Data & Categories) ---
    // Note: We use updateOnDuplicate or ignoreDuplicates logic implicitly by only inserting if table is likely empty
    // But for a seeder, we usually assume a clean slate.
    
    // 1. Ref Tables
    await queryInterface.bulkInsert('ref_countries', [
        { name: 'United States', code: 'US', phone_code: '+1', flag: '🇺🇸' },
        { name: 'United Arab Emirates', code: 'AE', phone_code: '+971', flag: '🇦🇪' },
        { name: 'Germany', code: 'DE', phone_code: '+49', flag: '🇩🇪' },
    ]);

    await queryInterface.bulkInsert('ref_currencies', [
        { name: 'UAE Dirham', code: 'AED', symbol: 'AED' },
        { name: 'US Dollar', code: 'USD', symbol: '$' },
    ]);

    await queryInterface.bulkInsert('ref_nature_of_business', [
        { name: 'Manufacturer' }, { name: 'Distributor' }, { name: 'Reseller' }
    ]);

    await queryInterface.bulkInsert('ref_controlled_item_types', [
        { name: 'Dual-Use Goods' }, { name: 'Military Goods' }, { name: 'Not Controlled' }
    ]);

    // 2. Categories
    // We insert Parent first, then Children
    await queryInterface.bulkInsert('categories', [
        { id: 1, name: 'Automotive', slug: 'automotive', level: 0, is_active: true, created_at: timestamp, updated_at: timestamp },
        { id: 10, name: 'Electronics', slug: 'electronics', level: 0, is_active: true, created_at: timestamp, updated_at: timestamp },
    ]);

    await queryInterface.bulkInsert('categories', [
        { id: 2, name: 'Armoured Vehicles', slug: 'armoured-vehicles', parent_id: 1, level: 1, created_at: timestamp, updated_at: timestamp },
        { id: 3, name: 'Spare Parts', slug: 'spare-parts', parent_id: 1, level: 1, created_at: timestamp, updated_at: timestamp },
        { id: 11, name: 'Surveillance', slug: 'surveillance', parent_id: 10, level: 1, created_at: timestamp, updated_at: timestamp },
    ]);

    // --- PART 2: DUMMY USERS ---

    // UUIDs for linking
    const adminId = uuidv4();
    const vendorActiveId = uuidv4();
    const vendorPendingId = uuidv4();
    const customerId = uuidv4();

    const usersData = [
        // 1. Super Admin
        {
            id: adminId,
            name: 'Super Admin',
            username: 'admin',
            email: 'admin@demo.com',
            password: PASSWORD_HASH,
            user_type: 'super_admin',
            email_verified: true,
            is_active: true,
            created_at: timestamp,
            updated_at: timestamp
        },
        // 2. Approved Vendor
        {
            id: vendorActiveId,
            name: 'John Vendor',
            username: 'armour_systems',
            email: 'vendor@demo.com',
            password: PASSWORD_HASH,
            user_type: 'vendor',
            email_verified: true,
            phone_verified: true,
            completion_percentage: 100,
            is_active: true,
            created_at: timestamp,
            updated_at: timestamp
        },
        // 3. Pending Vendor
        {
            id: vendorPendingId,
            name: 'Alice Newcomer',
            username: 'new_tech',
            email: 'pending@demo.com',
            password: PASSWORD_HASH,
            user_type: 'vendor',
            email_verified: true,
            completion_percentage: 60,
            is_active: true,
            created_at: timestamp,
            updated_at: timestamp
        },
        // 4. Customer
        {
            id: customerId,
            name: 'Bob Buyer',
            username: 'global_security',
            email: 'customer@demo.com',
            password: PASSWORD_HASH,
            user_type: 'customer',
            email_verified: true,
            is_active: true,
            created_at: timestamp,
            updated_at: timestamp
        }
    ];

    // Using bulkInsert with updateOnDuplicate to handle reruns safely for users
    await queryInterface.bulkInsert('users', usersData);

    // --- PART 3: PROFILES ---
    
    const profilesData = [
        {
            id: uuidv4(),
            user_id: vendorActiveId,
            company_name: 'Armour Systems Intl.',
            country: 'United Arab Emirates',
            nature_of_business: 'Manufacturer',
            license_number: 'LIC-998877',
            onboarding_status: 'approved',
            terms_accepted: true,
            created_at: timestamp,
            updated_at: timestamp
        },
        {
            id: uuidv4(),
            user_id: vendorPendingId,
            company_name: 'New Tech Startups',
            country: 'Germany',
            nature_of_business: 'Reseller',
            onboarding_status: 'pending_verification',
            submitted_for_approval: true,
            created_at: timestamp,
            updated_at: timestamp
        },
        {
            id: uuidv4(),
            user_id: customerId,
            company_name: 'Global Security Corp',
            country: 'United States',
            onboarding_status: 'approved',
            created_at: timestamp,
            updated_at: timestamp
        }
    ];
    await queryInterface.bulkInsert('user_profiles', profilesData);

    // --- PART 4: PRODUCTS ---
    
    // We need product IDs for orders later, so we can't easily rely on auto-increment return in seeders across DB types.
    // However, Sequelize seeders for Postgres usually reset sequence if we force IDs.
    // Let's rely on insertion order or assume IDs 1, 2, 3...
    
    const productsData = [
        // Product 1: Approved Vehicle (Vendor 1)
        {
            id: 101, // Manually setting ID to link later
            vendor_id: vendorActiveId,
            name: 'Tactical SUV B6',
            status: 'active',
            approval_status: 'approved',
            main_category_id: 1, // Automotive
            category_id: 2, // Armoured Vehicles
            base_price: 150000.00,
            currency: 'AED',
            stock: 5,
            armouring_level: 'B6',
            engine_type: 'V8 Turbo',
            country_of_origin: 'Germany',
            created_at: timestamp,
            updated_at: timestamp
        },
        // Product 2: Spare Part (Vendor 1)
        {
            id: 102,
            vendor_id: vendorActiveId,
            name: 'Run-flat Tire System',
            status: 'active',
            approval_status: 'approved',
            main_category_id: 1,
            category_id: 3, // Spare Parts
            base_price: 2500.00,
            currency: 'AED',
            stock: 100,
            created_at: timestamp,
            updated_at: timestamp
        },
        // Product 3: Pending Product (Vendor 2)
        {
            id: 103,
            vendor_id: vendorPendingId,
            name: 'Night Vision Goggles Gen3',
            status: 'draft',
            approval_status: 'pending',
            main_category_id: 10, // Electronics
            category_id: 11, // Surveillance
            base_price: 8500.00,
            currency: 'AED',
            stock: 20,
            controlled_item_type: 'Dual-Use Goods',
            created_at: timestamp,
            updated_at: timestamp
        }
    ];
    await queryInterface.bulkInsert('products', productsData);

    // --- PART 5: PRODUCT MEDIA ---
    await queryInterface.bulkInsert('product_media', [
        { product_id: 101, type: 'image', url: 'https://via.placeholder.com/800x600?text=Tactical+SUV', is_cover: true, created_at: timestamp, updated_at: timestamp },
        { product_id: 102, type: 'image', url: 'https://via.placeholder.com/800x600?text=Tire', is_cover: true, created_at: timestamp, updated_at: timestamp },
    ]);

    // --- PART 6: ORDERS ---
    const orderId1 = uuidv4();
    const orderId2 = uuidv4();

    const ordersData = [
        {
            id: orderId1,
            user_id: customerId,
            status: 'processing',
            total_amount: 155000.00, // 1 SUV + 2 Tires
            currency: 'AED',
            payment_status: 'paid',
            compliance_status: 'approved',
            created_at: timestamp,
            updated_at: timestamp
        },
        {
            id: orderId2,
            user_id: customerId,
            status: 'pending_approval',
            total_amount: 8500.00,
            currency: 'AED',
            type: 'request',
            compliance_status: 'pending_review',
            created_at: timestamp,
            updated_at: timestamp
        }
    ];
    await queryInterface.bulkInsert('orders', ordersData);

    // --- PART 7: ORDER ITEMS ---
    const orderItemsData = [
        // Order 1 Items
        {
            id: uuidv4(),
            order_id: orderId1,
            product_id: 101, // SUV
            vendor_id: vendorActiveId,
            quantity: 1,
            price: 150000.00,
            product_name: 'Tactical SUV B6',
            created_at: timestamp,
            updated_at: timestamp
        },
        {
            id: uuidv4(),
            order_id: orderId1,
            product_id: 102, // Tires
            vendor_id: vendorActiveId,
            quantity: 2,
            price: 2500.00,
            product_name: 'Run-flat Tire System',
            created_at: timestamp,
            updated_at: timestamp
        },
        // Order 2 Items
        {
            id: uuidv4(),
            order_id: orderId2,
            product_id: 103, // Night Vision (Pending approval product, simulates a request)
            vendor_id: vendorPendingId,
            quantity: 1,
            price: 8500.00,
            product_name: 'Night Vision Goggles Gen3',
            created_at: timestamp,
            updated_at: timestamp
        }
    ];
    await queryInterface.bulkInsert('order_items', orderItemsData);

    console.log('🎉 Dummy Data Seeding Complete!');
    process.exit(0);

  } catch (err: any) {
    console.error('Seeding Dummy Data failed:', err.message);
    if (err.original) console.error('PG ERROR MSG:', err.original.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seedDummyData();