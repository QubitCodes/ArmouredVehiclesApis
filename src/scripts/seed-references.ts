import 'dotenv/config'; // Load env vars
import { sequelize } from '../config/database';
import {
  RefCountry,
  RefCurrency,
  RefVendorCategory,
  RefNatureOfBusiness,
  RefEndUseMarket,
  RefBuyerType,
  RefVerificationMethod,
  RefProofType,
  RefPaymentMethod,
  RefFinancialInstitution,
  RefEntityType
} from '../models/Reference';


export async function seedReferences() {
  try {
    console.log('... Seeding References START');

    // Entity Types
    console.log('... Seeding Entity Types');
    const entityTypes = [
      { name: 'Individual', display_order: 1 },
      { name: 'Sole Establishment', display_order: 2 },
      { name: 'Limited Liability Company (LLC)', display_order: 3 },
      { name: 'Public Joint Stock Company (PJSC)', display_order: 4 },
      { name: 'Private Joint Stock Company (PrJSC)', display_order: 5 },
      { name: 'Branch of a Foreign Company', display_order: 6 },
      { name: 'Branch of a UAE Company', display_order: 7 },
      { name: 'Branch of a GCC Company', display_order: 8 },
      { name: 'Branch of a Free Zone Company', display_order: 9 },
      { name: 'Civil Company', display_order: 10 },
    ];
    for (const e of entityTypes) {
      await RefEntityType.findOrCreate({ where: { name: e.name }, defaults: e });
    }
    console.log('Seeded Entity Types');

    // Sync specific models if needed, but main seed.ts handles sync
    // await RefCountry.sync();
    // ...

    // Countries
    console.log('... Seeding Countries');
    const countries = [
      { name: 'United States', code: 'US', phone_code: '+1', flag: '🇺🇸' },
      { name: 'United Kingdom', code: 'GB', phone_code: '+44', flag: '🇬🇧' },
      { name: 'India', code: 'IN', phone_code: '+91', flag: '🇮🇳' },
      { name: 'United Arab Emirates', code: 'AE', phone_code: '+971', flag: '🇦🇪' },
      { name: 'Canada', code: 'CA', phone_code: '+1', flag: '🇨🇦' },
      { name: 'Germany', code: 'DE', phone_code: '+49', flag: '🇩🇪' },
    ];

    for (const c of countries) {
      await RefCountry.findOrCreate({
        where: { code: c.code },
        defaults: c
      });
    }
    console.log('Seeded Countries');

    // Currencies
    const currencies = [
      { name: 'UAE Dirham', code: 'AED', symbol: 'د.إ' },
      { name: 'US Dollar', code: 'USD', symbol: '$' },
      { name: 'Euro', code: 'EUR', symbol: '€' },
      { name: 'British Pound', code: 'GBP', symbol: '£' },
      { name: 'Indian Rupee', code: 'INR', symbol: '₹' },
    ];

    for (const c of currencies) {
      await RefCurrency.findOrCreate({ where: { code: c.code }, defaults: c });
    }
    console.log('Seeded Currencies');

    // Vendor Categories
    const categories = [
      { name: 'Armored Vehicles Manufacturer' },
      { name: 'Raw Materials Supplier' },
      { name: 'Ballistic Glass Manufacturer' },
      { name: 'Security Equipment Provider' },
    ];
    for (const c of categories) {
      await RefVendorCategory.findOrCreate({ where: { name: c.name }, defaults: c });
    }
    console.log('Seeded Vendor Categories');

    console.log('Seeded Vendor Categories');

    // Nature of Business
    console.log('... Seeding Nature of Business');
    const nob = [
      { name: 'Manufacturer' },
      { name: 'Distributor' },
      { name: 'Reseller' },
      { name: 'Service Provider' },
    ];
    for (const n of nob) {
      await RefNatureOfBusiness.findOrCreate({ where: { name: n.name }, defaults: n });
    }
    console.log('Seeded Nature of Business');

    // Buyer Types
    console.log('... Seeding Buyer Types');
    const buyerTypes = [
      { name: 'Individual' },
      { name: 'Dealership' },
      { name: 'Company' },
      { name: 'Government' },
    ];
    for (const b of buyerTypes) {
      await RefBuyerType.findOrCreate({ where: { name: b.name }, defaults: b });
    }
    console.log('Seeded Buyer Types');

    // Verification Methods
    console.log('... Seeding Verification Methods');
    const verificationMethods = [
      {
        name: 'Video Call',
        description: 'Verify your physical location via a scheduled video call.',
        is_available: true,
        display_order: 1
      },
      {
        name: 'In-Person Visit',
        description: 'An associate will visit your registered address.',
        is_available: true,
        display_order: 2
      },
      {
        name: 'Phone Call',
        description: 'Verify details through a recorded phone interview.',
        is_available: true,
        display_order: 3
      }
    ];
    for (const v of verificationMethods) {
      await RefVerificationMethod.findOrCreate({ where: { name: v.name }, defaults: v });
    }
    console.log('Seeded Verification Methods');

    // Proof Types
    console.log('... Seeding Proof Types');
    const proofTypes = [
      { name: 'Bank Statement', display_order: 1 },
      { name: 'Cancelled Cheque', display_order: 2 },
      { name: 'Bank Letter', display_order: 3 }
    ];
    for (const p of proofTypes) {
      await RefProofType.findOrCreate({ where: { name: p.name }, defaults: p });
    }
    console.log('Seeded Proof Types');

    // Payment Methods
    console.log('... Seeding Payment Methods');
    const paymentMethods = [
      { name: 'Bank Transfer', display_order: 1 },
      { name: 'Cheque', display_order: 2 }
    ];
    for (const method of paymentMethods) {
      await RefPaymentMethod.findOrCreate({ where: { name: method.name }, defaults: method });
    }
    console.log('Seeded Payment Methods');

    // Financial Institutions (UAE Examples)
    console.log('... Seeding Financial Institutions');
    const banks = [
      { name: 'Emirates NBD', country_code: 'AE' },
      { name: 'Abu Dhabi Commercial Bank (ADCB)', country_code: 'AE' },
      { name: 'Dubai Islamic Bank (DIB)', country_code: 'AE' },
      { name: 'First Abu Dhabi Bank (FAB)', country_code: 'AE' },
      { name: 'Mashreq Bank', country_code: 'AE' }
    ];
    for (const b of banks) {
      await RefFinancialInstitution.findOrCreate({ where: { name: b.name }, defaults: b });
    }
    console.log('Seeded Financial Institutions');

  } catch (err) {
    console.error('Seeding References failed:', err);
    throw err;
  }
}

// Allow standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  sequelize.authenticate().then(() => {
    seedReferences().then(() => sequelize.close());
  });
}
