import { NextResponse } from 'next/server';
import { sequelize } from '@/config/database';
import { 
  RefCountry, 
  RefCurrency, 
  RefVendorCategory,
  RefNatureOfBusiness,
  RefEndUseMarket
} from '@/models/Reference';

export async function POST() {
  try {
    await sequelize.authenticate();
    
    // Sync tables
    await RefCountry.sync();
    await RefCurrency.sync();
    await RefVendorCategory.sync();
    await RefNatureOfBusiness.sync();
    await RefEndUseMarket.sync();

    // Countries
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
        defaults: c as any
      });
    }

    // Currencies
    const currencies = [
      { name: 'US Dollar', code: 'USD', symbol: '$' },
      { name: 'Euro', code: 'EUR', symbol: '€' },
      { name: 'British Pound', code: 'GBP', symbol: '£' },
      { name: 'Indian Rupee', code: 'INR', symbol: '₹' },
      { name: 'UAE Dirham', code: 'AED', symbol: 'د.إ' },
    ];

    for (const c of currencies) {
        await RefCurrency.findOrCreate({ where: { code: c.code }, defaults: c as any });
    }

    // Vendor Categories
    const categories = [
        { name: 'Armored Vehicles Manufacturer' },
        { name: 'Raw Materials Supplier' },
        { name: 'Ballistic Glass Manufacturer' },
        { name: 'Security Equipment Provider' },
    ];
     for (const c of categories) {
        await RefVendorCategory.findOrCreate({ where: { name: c.name }, defaults: c as any });
    }
    
    // Nature of Business
    const nob = [
        { name: 'Manufacturer' },
        { name: 'Distributor' },
        { name: 'Reseller' },
        { name: 'Service Provider' },
    ];
    for (const n of nob) {
        await RefNatureOfBusiness.findOrCreate({ where: { name: n.name }, defaults: n as any });
    }

    return NextResponse.json({ success: true, message: 'References seeded successfully' });

  } catch (error: any) {
    console.error('Seeding error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
