import { db } from "./db";
import { 
  categories, 
  products, 
  refNatureOfBusiness, 
  refEndUseMarkets, 
  refLicenseTypes, 
  refCountries,
  refVendorCategories,
  refCurrencies,
  refPaymentMethods,
  refFinancialInstitutions,
  refProofTypes,
  refVerificationMethods
} from "@shared/schema";

export async function seedDatabase() {
  console.log("Seeding database...");

  try {
    // Seed reference tables
    await seedReferenceTables();
    
    // Check if categories already exist
    const existingCategories = await db.select().from(categories);
    
    if (existingCategories.length === 0) {
      // Insert categories
      const insertedCategories = await db.insert(categories).values([
        { name: "Core Vehicle Systems", image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=400", description: "Engines, Transmission, Chassis" },
        { name: "Armor Specific Systems", image: "https://images.unsplash.com/photo-1599369262337-ee47696c4266?auto=format&fit=crop&q=80&w=400", description: "Ballistic Glass, Steel, Kevlar" },
        { name: "Communication & Control", image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=400", description: "Radios, GPS, ECMs" },
        { name: "Climate & Interior", image: "https://images.unsplash.com/photo-1560965385-a7455d311394?auto=format&fit=crop&q=80&w=400", description: "HVAC, Seats, Dashboards" },
        { name: "Exterior & Utility", image: "https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?auto=format&fit=crop&q=80&w=400", description: "Lighting, Winches, Bumpers" },
        { name: "OEM Sourcing", image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=400", description: "Direct from Manufacturer" }
      ]).returning();

      console.log(`✓ Created ${insertedCategories.length} categories`);

      // Map category names to IDs
      const catMap: Record<string, number> = {};
      insertedCategories.forEach(cat => {
        catMap[cat.name] = cat.id;
      });

      // Insert sample products using actual category IDs
      const sampleProducts = [
        {
          name: "DFC - 4000 HybridDynamic Hybrid Rear Brake Pads",
          sku: "WHL-RF-001",
          price: "679.00",
          originalPrice: "850.00",
          image: "https://images.unsplash.com/photo-1611417866503-424626569738?auto=format&fit=crop&q=80&w=800",
          gallery: [
            "https://images.unsplash.com/photo-1611417866503-424626569738?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1600706432502-76b1e601a746?auto=format&fit=crop&q=80&w=800",
            "https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?auto=format&fit=crop&q=80&w=800"
          ],
          categoryId: catMap["Core Vehicle Systems"],
          department: "Wheels",
          description: "Military-grade runflat inserts for combat wheels. Designed for heavier vehicles with larger brake systems, DFC Heavy-Duty Brake Pads deliver exceptional braking performance in harsh conditions.",
          condition: "new" as const,
          stock: 50,
          make: "Toyota",
          model: "Land Cruiser 200",
          year: 2023,
          rating: "4.5",
          reviewCount: 3,
          actionType: "buy_now",
          features: [
            "Frequent braking environments, high speed, heavy traffic, steep gradients, towing, or off-roading",
            "Delivers strong, predictable friction level regardless of temperature, speed, or axle load",
            "Engineered to withstand extremely high operating temperature range",
            "Long pad wear, low noise, and low dust",
            "100% Asbestos Free",
            "100% Copper Free Eco-Friendly Formulation"
          ],
          specifications: JSON.stringify({
            "Series": "4000 HybridDynamic",
            "Friction Material Bonding Type": "Integrally Molded",
            "SKU #": "314159",
            "Weight": "6.64lbs",
            "Material": "Iron Alloy"
          }),
          vehicleFitment: JSON.stringify({
            "Genesis": ["2023-2025 Genesis Electrified GV70", "2021-2025 Genesis G80"],
            "Hyundai": ["2020-2024 Palisade"],
            "Kia": ["2020-2024 Telluride"]
          }),
          warranty: JSON.stringify({ period: "12 months/12,000 Miles Limited Warranty" })
        },
        {
          name: "Tactical LED Headlight System",
          sku: "LGT-TAC-002",
          price: "1450.00",
          image: "https://images.unsplash.com/photo-1552975662-72cb78d7e75b?auto=format&fit=crop&q=80&w=800",
          categoryId: catMap["Exterior & Utility"],
          department: "Lighting",
          description: "High-intensity tactical lighting for armored vehicles.",
          condition: "new" as const,
          stock: 100,
          make: "Universal",
          model: "Universal",
          year: 2024,
          rating: "4.8",
          reviewCount: 12,
          actionType: "buy_now"
        },
        {
          name: "Reinforced Suspension Kits",
          sku: "SUS-HD-003",
          price: "14890.00",
          image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=800",
          categoryId: catMap["Core Vehicle Systems"],
          department: "Suspension",
          description: "Heavy-duty suspension upgrades for up-armored chassis loads.",
          condition: "new" as const,
          stock: 15,
          make: "Toyota",
          model: "LC300",
          year: 2024,
          rating: "4.9",
          reviewCount: 5,
          actionType: "inquiry"
        },
        {
          name: "Turbochargers & Superchargers",
          sku: "ENG-TRB-004",
          price: "4500.00",
          image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800",
          categoryId: catMap["Core Vehicle Systems"],
          department: "Engine",
          description: "Performance forced induction for heavy payloads.",
          condition: "new" as const,
          stock: 20,
          make: "Nissan",
          model: "Patrol Y62",
          year: 2023,
          rating: "4.7",
          reviewCount: 8,
          actionType: "buy_now"
        },
        {
          name: "Ballistic Glass Panel B6",
          sku: "ARM-GLS-005",
          price: "2200.00",
          image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800",
          categoryId: catMap["Armor Specific Systems"],
          department: "Glass",
          description: "Certified B6 level ballistic protection glass replacement.",
          condition: "new" as const,
          stock: 10,
          make: "Toyota",
          model: "Hilux",
          year: 2022,
          rating: "5.0",
          reviewCount: 2,
          actionType: "inquiry"
        },
        {
          name: "Fuel Pumps, Injectors & Rails",
          sku: "ENG-FUL-006",
          price: "850.00",
          image: "https://images.unsplash.com/photo-1606577924004-79d2a2971e38?auto=format&fit=crop&q=80&w=800",
          categoryId: catMap["Core Vehicle Systems"],
          department: "Fuel System",
          description: "High-flow fuel delivery components.",
          condition: "new" as const,
          stock: 40,
          make: "Universal",
          model: "Universal",
          year: 2024,
          rating: "4.6",
          reviewCount: 15,
          actionType: "buy_now"
        },
        {
          name: "Military Radio Communication Kit",
          sku: "COM-RAD-007",
          price: "3200.00",
          image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800",
          categoryId: catMap["Communication & Control"],
          department: "Communications",
          description: "Encrypted tactical radio system for secure field communications.",
          condition: "new" as const,
          stock: 25,
          make: "Harris",
          model: "Falcon III",
          year: 2024,
          rating: "4.9",
          reviewCount: 7,
          actionType: "inquiry"
        },
        {
          name: "Armored HVAC Climate Control Unit",
          sku: "CLI-HVAC-008",
          price: "5600.00",
          image: "https://images.unsplash.com/photo-1560965385-a7455d311394?auto=format&fit=crop&q=80&w=800",
          categoryId: catMap["Climate & Interior"],
          department: "Climate Control",
          description: "Heavy-duty climate control designed for armored vehicle cabins.",
          condition: "new" as const,
          stock: 12,
          make: "Universal",
          model: "AV-Series",
          year: 2024,
          rating: "4.4",
          reviewCount: 4,
          actionType: "buy_now"
        }
      ];

      const insertedProducts = await db.insert(products).values(sampleProducts as any).returning();
      console.log(`✓ Created ${insertedProducts.length} products`);

    } else {
      console.log("Database already seeded, skipping...");
    }

    console.log("✓ Database seeding completed");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

async function seedReferenceTables() {
  // Seed Nature of Business
  const existingNob = await db.select().from(refNatureOfBusiness);
  if (existingNob.length === 0) {
    await db.insert(refNatureOfBusiness).values([
      { name: "Manufacturer", displayOrder: 1 },
      { name: "OEM Dealer", displayOrder: 2 },
      { name: "Wholesaler / Distributor", displayOrder: 3 },
      { name: "Retailer", displayOrder: 4 },
      { name: "E-commerce Seller", displayOrder: 5 },
      { name: "Importer / Exporter", displayOrder: 6 },
      { name: "Trading Company", displayOrder: 7 },
      { name: "Service Provider", displayOrder: 8 },
      { name: "Defense Supplier", displayOrder: 9 },
      { name: "Vehicle Armoring", displayOrder: 10 },
      { name: "Government Agency", displayOrder: 11 },
      { name: "Contractor / Subcontractor", displayOrder: 12 },
      { name: "Logistics / Freight Services", displayOrder: 13 },
      { name: "Construction / Engineering", displayOrder: 14 },
      { name: "Technology / IT Solutions Provider", displayOrder: 15 },
      { name: "Healthcare / Medical Supplier", displayOrder: 16 },
      { name: "Education / Training Provider", displayOrder: 17 },
      { name: "Financial / Consulting Services", displayOrder: 18 },
      { name: "Nonprofit / NGO", displayOrder: 19 },
      { name: "Other", displayOrder: 20 },
    ]);
    console.log("✓ Seeded ref_nature_of_business");
  }

  // Seed End Use Markets
  const existingMarkets = await db.select().from(refEndUseMarkets);
  if (existingMarkets.length === 0) {
    await db.insert(refEndUseMarkets).values([
      { name: "Civilian", displayOrder: 1 },
      { name: "Military", displayOrder: 2 },
      { name: "Law Enforcement", displayOrder: 3 },
      { name: "Government", displayOrder: 4 },
      { name: "Export", displayOrder: 5 },
    ]);
    console.log("✓ Seeded ref_end_use_markets");
  }

  // Seed License Types
  const existingLicenses = await db.select().from(refLicenseTypes);
  if (existingLicenses.length === 0) {
    await db.insert(refLicenseTypes).values([
      { name: "MOD License", displayOrder: 1 },
      { name: "EOCN Approval", displayOrder: 2 },
      { name: "ITAR Registration", displayOrder: 3 },
      { name: "Local approval from authorities", displayOrder: 4 },
      { name: "None", displayOrder: 5 },
    ]);
    console.log("✓ Seeded ref_license_types");
  }

  // Seed Countries
  const existingCountries = await db.select().from(refCountries);
  if (existingCountries.length === 0) {
    await db.insert(refCountries).values([
      { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", phoneCode: "+971", displayOrder: 1 },
      { code: "SA", name: "Saudi Arabia (KSA)", flag: "🇸🇦", phoneCode: "+966", displayOrder: 2 },
      { code: "QA", name: "Qatar", flag: "🇶🇦", phoneCode: "+974", displayOrder: 3 },
      { code: "OM", name: "Oman", flag: "🇴🇲", phoneCode: "+968", displayOrder: 4 },
      { code: "KW", name: "Kuwait", flag: "🇰🇼", phoneCode: "+965", displayOrder: 5 },
      { code: "BH", name: "Bahrain", flag: "🇧🇭", phoneCode: "+973", displayOrder: 6 },
      { code: "IN", name: "India", flag: "🇮🇳", phoneCode: "+91", displayOrder: 7 },
      { code: "ID", name: "Indonesia", flag: "🇮🇩", phoneCode: "+62", displayOrder: 8 },
      { code: "IR", name: "Iran", flag: "🇮🇷", phoneCode: "+98", displayOrder: 9 },
      { code: "IQ", name: "Iraq", flag: "🇮🇶", phoneCode: "+964", displayOrder: 10 },
      { code: "IE", name: "Ireland", flag: "🇮🇪", phoneCode: "+353", displayOrder: 11 },
      { code: "IL", name: "Israel", flag: "🇮🇱", phoneCode: "+972", displayOrder: 12 },
      { code: "IT", name: "Italy", flag: "🇮🇹", phoneCode: "+39", displayOrder: 13 },
      { code: "JO", name: "Jordan", flag: "🇯🇴", phoneCode: "+962", displayOrder: 14 },
      { code: "EG", name: "Egypt", flag: "🇪🇬", phoneCode: "+20", displayOrder: 15 },
      { code: "PK", name: "Pakistan", flag: "🇵🇰", phoneCode: "+92", displayOrder: 16 },
      { code: "TR", name: "Turkey", flag: "🇹🇷", phoneCode: "+90", displayOrder: 17 },
      { code: "US", name: "United States", flag: "🇺🇸", phoneCode: "+1", displayOrder: 18 },
      { code: "GB", name: "United Kingdom", flag: "🇬🇧", phoneCode: "+44", displayOrder: 19 },
      { code: "DE", name: "Germany", flag: "🇩🇪", phoneCode: "+49", displayOrder: 20 },
      { code: "FR", name: "France", flag: "🇫🇷", phoneCode: "+33", displayOrder: 21 },
      { code: "AU", name: "Australia", flag: "🇦🇺", phoneCode: "+61", displayOrder: 22 },
      { code: "SG", name: "Singapore", flag: "🇸🇬", phoneCode: "+65", displayOrder: 23 },
      { code: "MY", name: "Malaysia", flag: "🇲🇾", phoneCode: "+60", displayOrder: 24 },
      { code: "TH", name: "Thailand", flag: "🇹🇭", phoneCode: "+66", displayOrder: 25 },
      { code: "ZA", name: "South Africa", flag: "🇿🇦", phoneCode: "+27", displayOrder: 26 },
      { code: "NG", name: "Nigeria", flag: "🇳🇬", phoneCode: "+234", displayOrder: 27 },
      { code: "KE", name: "Kenya", flag: "🇰🇪", phoneCode: "+254", displayOrder: 28 },
      { code: "BR", name: "Brazil", flag: "🇧🇷", phoneCode: "+55", displayOrder: 29 },
      { code: "MX", name: "Mexico", flag: "🇲🇽", phoneCode: "+52", displayOrder: 30 },
    ]);
    console.log("✓ Seeded ref_countries");
  }

  // Seed Vendor Categories (for Step 4 - categories vendors can sell in)
  const existingVendorCategories = await db.select().from(refVendorCategories);
  if (existingVendorCategories.length === 0) {
    await db.insert(refVendorCategories).values([
      { name: "Engine Systems", displayOrder: 1 },
      { name: "Transmission & Drivetrain", displayOrder: 2 },
      { name: "Chassis & Suspension", displayOrder: 3 },
      { name: "Electrical Systems", isControlled: true, controlNote: "Controlled if Mil Standard", displayOrder: 4 },
      { name: "Runflat & Tire Systems", displayOrder: 5 },
      { name: "Surveillance & Monitoring", displayOrder: 6 },
      { name: "Turrets & Mounts", isControlled: true, controlNote: "Controlled item MOD/EOCN", displayOrder: 7 },
      { name: "Lighting Systems", isControlled: true, controlNote: "Controlled if Mil Standard", displayOrder: 8 },
      { name: "HVAC & Thermal Management", displayOrder: 9 },
      { name: "Ballistic Protection", isControlled: true, controlNote: "Controlled item MOD/EOCN", displayOrder: 10 },
      { name: "Body & Structure Reinforcements", displayOrder: 11 },
      { name: "Braking Systems", displayOrder: 12 },
      { name: "Gunports, Hinges & Weapon-Mount Interfaces", isControlled: true, controlNote: "Controlled item MOD/EOCN", displayOrder: 13 },
      { name: "Countermeasures", displayOrder: 14 },
      { name: "Fuel & Water Systems", displayOrder: 15 },
      { name: "Communication Equipment", isControlled: true, controlNote: "Controlled Items", displayOrder: 16 },
      { name: "Interior Kits", displayOrder: 17 },
      { name: "Fabrication & Integration", isControlled: true, controlNote: "Controlled Item MOD/ITAR-Design Control", displayOrder: 18 },
      { name: "Drive-Side Conversion Components", controlNote: "LHD ↔ RHD", displayOrder: 19 },
      { name: "Exterior Accessories", displayOrder: 20 },
      { name: "OEM Components", displayOrder: 21 },
      { name: "Value-Oriented OEM Chassis", displayOrder: 22 },
      { name: "Military & Tactical Chassis Suppliers", isControlled: true, controlNote: "Controlled - End User declaration", displayOrder: 23 },
      { name: "Recovery & Mobility", displayOrder: 24 },
    ]);
    console.log("✓ Seeded ref_vendor_categories");
  }

  // Seed Currencies
  const existingCurrencies = await db.select().from(refCurrencies);
  if (existingCurrencies.length === 0) {
    await db.insert(refCurrencies).values([
      { code: "AED", name: "UAE Dirham", symbol: "د.إ", displayOrder: 1 },
      { code: "USD", name: "US Dollar", symbol: "$", displayOrder: 2 },
      { code: "EUR", name: "Euro", symbol: "€", displayOrder: 3 },
      { code: "GBP", name: "British Pound", symbol: "£", displayOrder: 4 },
      { code: "SAR", name: "Saudi Riyal", symbol: "﷼", displayOrder: 5 },
      { code: "INR", name: "Indian Rupee", symbol: "₹", displayOrder: 6 },
    ]);
    console.log("✓ Seeded ref_currencies");
  }

  // Seed Payment Methods
  const existingPaymentMethods = await db.select().from(refPaymentMethods);
  if (existingPaymentMethods.length === 0) {
    await db.insert(refPaymentMethods).values([
      { name: "Credit or debit card", icon: "credit-card", displayOrder: 1 },
      { name: "Tamara", icon: "tamara", displayOrder: 2 },
      { name: "Tabby", icon: "tabby", displayOrder: 3 },
      { name: "Apple Pay", icon: "apple-pay", displayOrder: 4 },
      { name: "PayPal", icon: "paypal", displayOrder: 5 },
    ]);
    console.log("✓ Seeded ref_payment_methods");
  }

  // Seed Financial Institutions (UAE Banks)
  const existingBanks = await db.select().from(refFinancialInstitutions);
  if (existingBanks.length === 0) {
    await db.insert(refFinancialInstitutions).values([
      { name: "Emirates NBD", countryCode: "AE", swiftCode: "EABORABI", displayOrder: 1 },
      { name: "Abu Dhabi Commercial Bank", countryCode: "AE", swiftCode: "ADCBAEAA", displayOrder: 2 },
      { name: "First Abu Dhabi Bank", countryCode: "AE", swiftCode: "NBADAEAA", displayOrder: 3 },
      { name: "Dubai Islamic Bank", countryCode: "AE", swiftCode: "DUIBAEAD", displayOrder: 4 },
      { name: "Mashreq Bank", countryCode: "AE", swiftCode: "BOMLAEAD", displayOrder: 5 },
      { name: "RAKBANK", countryCode: "AE", swiftCode: "NABORAKA", displayOrder: 6 },
      { name: "Commercial Bank of Dubai", countryCode: "AE", swiftCode: "CBDUAEAD", displayOrder: 7 },
      { name: "HSBC UAE", countryCode: "AE", swiftCode: "BBABORAB", displayOrder: 8 },
      { name: "State Bank of India (UAE)", countryCode: "AE", displayOrder: 9 },
      { name: "ICICI Bank (UAE)", countryCode: "AE", displayOrder: 10 },
      { name: "HDFC Bank (India)", countryCode: "IN", swiftCode: "HDFCINBB", displayOrder: 11 },
      { name: "State Bank of India", countryCode: "IN", swiftCode: "SBININBB", displayOrder: 12 },
      { name: "ICICI Bank", countryCode: "IN", swiftCode: "ABORINBB", displayOrder: 13 },
      { name: "Axis Bank", countryCode: "IN", swiftCode: "AXISINBB", displayOrder: 14 },
      { name: "Kotak Mahindra Bank", countryCode: "IN", swiftCode: "ABORINBB", displayOrder: 15 },
    ]);
    console.log("✓ Seeded ref_financial_institutions");
  }

  // Seed Proof Types
  const existingProofTypes = await db.select().from(refProofTypes);
  if (existingProofTypes.length === 0) {
    await db.insert(refProofTypes).values([
      { name: "Bank Statement", displayOrder: 1 },
      { name: "Cancelled Cheque", displayOrder: 2 },
      { name: "Bank Letter", displayOrder: 3 },
      { name: "Account Confirmation Letter", displayOrder: 4 },
    ]);
    console.log("✓ Seeded ref_proof_types");
  }

  // Seed Verification Methods
  const existingVerificationMethods = await db.select().from(refVerificationMethods);
  if (existingVerificationMethods.length === 0) {
    await db.insert(refVerificationMethods).values([
      { name: "Over a Live Video Call", description: "Join a secure video call from any location at your preferred date and time to complete your identity verification. We may also send a postcard with a one-time passcode and additional instructions to your registered address for address verification.", isAvailable: true, displayOrder: 1 },
      { name: "Verification at Your Location", description: "An Armored Mart representative will visit your business address at a scheduled date and time to help you complete the verification process.", isAvailable: false, displayOrder: 2 },
      { name: "Meet at a Local Verification Center", description: "You can visit a nearby Armored Mart verification center and meet with one of our associates to complete your verification.", isAvailable: false, displayOrder: 3 },
    ]);
    console.log("✓ Seeded ref_verification_methods");
  }
}
