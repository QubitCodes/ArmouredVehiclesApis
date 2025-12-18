import { db } from "./db";
import { categories, products } from "@shared/schema";

export async function seedDatabase() {
  console.log("Seeding database...");

  try {
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
