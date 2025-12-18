// Mock Data and simulated API calls based on the SRS and API list
// In a real app, these would be fetch calls to the backend

export interface Review {
  id: number;
  user: string;
  rating: number;
  date: string;
  comment: string;
  verifiedPurchase: boolean;
  avatar?: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  price: number | null; // Price can be null if not authenticated
  originalPrice?: number;
  image: string;
  gallery?: string[];
  category: string;
  department?: string;
  description: string;
  condition: 'new' | 'used' | 'refurbished';
  stock: number;
  vendor: string;
  make: string;
  model: string;
  year: number;
  rating?: number;
  reviewCount?: number;
  attributes?: {
    surfaceType?: string;
    frictionalMaterial?: string;
    abutmentClipsIncluded?: boolean;
    brakeLubricantIncluded?: boolean;
    [key: string]: any;
  };
  // New fields
  features?: string[];
  specifications?: Record<string, string>;
  vehicleFitment?: Record<string, string[]>; // Brand -> Models
  warranty?: {
    period: string;
    details: Record<string, string>;
  };
  sellerInfo?: {
    name: string;
    rating: number;
    joinedDate: string;
    responseRate: string;
  };
  reviews?: Review[];
  actionType?: 'buy_now' | 'inquiry'; // For different button types
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'admin' | 'vendor_owner' | 'vendor_employee';
  is_vendor: boolean; // Explicit flag as requested
  avatar?: string;
  completionPercentage?: number;
}

export interface Order {
  id: string;
  date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  total: number;
  items: {
    productId: number;
    name: string;
    image: string;
    price: number;
    quantity: number;
  }[];
  trackingNumber?: string;
  estimatedDelivery?: string;
}

export interface Category {
  id: number;
  name: string;
  image: string;
  description: string; // Not visible in frontend
}

export interface Slide {
  id: number;
  title?: string;
  subtitle?: string;
  buttonText: string;
  image: string;
  link: string;
}

export const MOCK_SLIDES: Slide[] = [
  {
    id: 1,
    title: "DEFENCE COMMERCE, REINVENTED.",
    subtitle: "Built for Security. Powered by Compliance.",
    buttonText: "LEARN MORE",
    image: "https://images.unsplash.com/photo-1595208823526-a322dc84f509?auto=format&fit=crop&q=80&w=1600", // Placeholder for armored vehicle
    link: "/products"
  }
];

export const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: "Core Vehicle Systems", image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=400", description: "Engines, Transmission, Chassis" },
  { id: 2, name: "Armor Specific Systems", image: "https://images.unsplash.com/photo-1599369262337-ee47696c4266?auto=format&fit=crop&q=80&w=400", description: "Ballistic Glass, Steel, Kevlar" },
  { id: 3, name: "Communication & Control", image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=400", description: "Radios, GPS, ECMs" },
  { id: 4, name: "Climate & Interior", image: "https://images.unsplash.com/photo-1560965385-a7455d311394?auto=format&fit=crop&q=80&w=400", description: "HVAC, Seats, Dashboards" },
  { id: 5, name: "Exterior & Utility", image: "https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?auto=format&fit=crop&q=80&w=400", description: "Lighting, Winches, Bumpers" },
  { id: 6, name: "OEM Sourcing", image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=400", description: "Direct from Manufacturer" }
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "DFC - 4000 HybridDynamic Hybrid Rear Brake Pads",
    sku: "WHL-RF-001",
    price: 679.00,
    originalPrice: 850.00,
    image: "https://images.unsplash.com/photo-1611417866503-424626569738?auto=format&fit=crop&q=80&w=800",
    gallery: [
      "https://images.unsplash.com/photo-1611417866503-424626569738?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1600706432502-76b1e601a746?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800"
    ],
    category: "Core Vehicle Systems",
    department: "Wheels",
    description: "Military-grade runflat inserts for combat wheels. Designed for heavier vehicles with larger brake systems, DFC Heavy-Duty Brake Pads deliver exceptional braking performance in harsh conditions. DFC Heavy-Duty brake pads are exclusively engineered and formulated to withstand extreme heat, heavy duty operation, frequent stopping, or towing.",
    condition: 'new',
    stock: 50,
    vendor: "ArmoredMart Direct",
    make: "Toyota",
    model: "Land Cruiser 200",
    year: 2023,
    rating: 4.5,
    reviewCount: 3,
    actionType: 'buy_now',
    specifications: {
       "Series": "4000 HybridDynamic",
       "Friction Material Bonding Type": "Integrally Molded",
       "SKU #": "314159",
       "Weight": "6.64lbs",
       "Brake Kit Vented Type Front": "Vented",
       "Material": "Iron Alloy",
       "Minimum Pad Quantity": "4",
       "Mounting Bolt Hole Quantity": "5",
       "Outside Diameter": "12.2mm",
       "Center Hole Diameter": "65.5mm"
    },
    features: [
       "Frequent braking environments, high speed, heavy traffic, steep gradients, towing, or off-roading",
       "Delivers strong, predictable friction level regardless of temperature, speed, or axle load",
       "Engineered to withstand extremely high operating temperature range",
       "Long pad wear, low noise, and low dust",
       "100% Asbestos Free",
       "100% Copper Free Eco-Friendly Formulation"
    ],
    vehicleFitment: {
       "Genesis": ["2023-2025 Genesis Electrified GV70", "2021-2025 Genesis G80", "2023-2025 Genesis G90"],
       "Hyundai": ["2020-2024 Palisade", "2021-2024 Santa Fe"],
       "Kia": ["2020-2024 Telluride"]
    },
    warranty: {
       period: "12 months/12,000 Miles Limited Warranty",
       details: {}
    },
    reviews: [
       {
          id: 1,
          user: "Omar Abdullah Al Mansoori",
          rating: 5,
          date: "Nov 23, 2024",
          verifiedPurchase: true,
          comment: "Great price, good quality, only supplier that had them except gm who wanted 183 just for the front. CAMO sent all four say no more for 350. I'm fine okay.",
          avatar: "https://randomuser.me/api/portraits/men/32.jpg"
       },
       {
          id: 2,
          user: "Anonymous",
          rating: 4,
          date: "Oct 15, 2024",
          verifiedPurchase: true,
          comment: "Buy them now, you won't regret it day night and day, you will be shocked at the difference, absolutely shocked!!",
          avatar: "https://randomuser.me/api/portraits/men/44.jpg"
       },
       {
          id: 3,
          user: "John Smith",
          rating: 5,
          date: "Sep 01, 2024",
          verifiedPurchase: true,
          comment: "Perfect fit for my LC200. Very happy with the performance.",
          avatar: "https://randomuser.me/api/portraits/men/12.jpg"
       }
    ]
  },
  {
    id: 2,
    name: "Headlights (LED, HID, Halogen)",
    sku: "LGT-TAC-002",
    price: 1450.00,
    image: "https://images.unsplash.com/photo-1552975662-72cb78d7e75b?auto=format&fit=crop&q=80&w=800", // Tactical light placeholder
    category: "Exterior & Utility",
    department: "Lighting",
    description: "High-intensity tactical lighting for armored vehicles.",
    condition: 'new',
    stock: 100,
    vendor: "Lumina Defense",
    make: "Universal",
    model: "Universal",
    year: 2024,
    rating: 4.8,
    reviewCount: 12,
    actionType: 'buy_now'
  },
  {
    id: 3,
    name: "Reinforced Suspension Kits",
    sku: "SUS-HD-003",
    price: 14890.00,
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=800",
    category: "Core Vehicle Systems",
    department: "Suspension",
    description: "Heavy-duty suspension upgrades for up-armored chassis loads.",
    condition: 'new',
    stock: 15,
    vendor: "TrackReady Defense",
    make: "Toyota",
    model: "LC300",
    year: 2024,
    rating: 4.9,
    reviewCount: 5,
    actionType: 'inquiry'
  },
  {
    id: 4,
    name: "Turbochargers & Superchargers",
    sku: "ENG-TRB-004",
    price: 4500.00,
    image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800",
    category: "Core Vehicle Systems",
    department: "Engine",
    description: "Performance forced induction for heavy payloads.",
    condition: 'new',
    stock: 20,
    vendor: "PowerTrain Systems",
    make: "Nissan",
    model: "Patrol Y62",
    year: 2023,
    rating: 4.7,
    reviewCount: 8,
    actionType: 'buy_now'
  },
  {
    id: 5,
    name: "Ballistic Glass Panel B6",
    sku: "ARM-GLS-005",
    price: 2200.00,
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800",
    category: "Armor Specific Systems",
    department: "Glass",
    description: "Certified B6 level ballistic protection glass replacement.",
    condition: 'new',
    stock: 10,
    vendor: "ShieldGlass",
    make: "Toyota",
    model: "Hilux",
    year: 2022,
    rating: 5.0,
    reviewCount: 2,
    actionType: 'inquiry'
  },
  {
    id: 6,
    name: "Fuel Pumps, Injectors & Rails",
    sku: "ENG-FUL-006",
    price: 850.00,
    image: "https://images.unsplash.com/photo-1606577924004-79d2a2971e38?auto=format&fit=crop&q=80&w=800",
    category: "Core Vehicle Systems",
    department: "Fuel System",
    description: "High-flow fuel delivery components.",
    condition: 'new',
    stock: 40,
    vendor: "FuelFlow",
    make: "Universal",
    model: "Universal",
    year: 2024,
    rating: 4.6,
    reviewCount: 15,
    actionType: 'buy_now'
  }
];

export const MOCK_FILTERS = {
  brands: ["ArmoredMart Direct", "Lumina Defense", "TrackReady Defense", "PowerTrain Systems", "ShieldGlass", "FuelFlow"],
  departments: ["Wheels", "Lighting", "Suspension", "Engine", "Glass", "Fuel System"],
  productTypes: [
    { name: "Brake Pads", image: "https://images.unsplash.com/photo-1600706432502-76b1e601a746?auto=format&fit=crop&q=80&w=200" },
    { name: "Disc Brake Pad", image: "https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?auto=format&fit=crop&q=80&w=200" },
    { name: "Brake Rotors", image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=200" },
    { name: "Parking Brake Shoe", image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=200" }
  ],
  surfaceTypes: ["Heavy Duty", "Tactical", "Standard", "Performance"],
  frictionalMaterials: ["Ceramic", "Semi-Metallic", "Organic", "Steel"]
};

// Simulated API calls matching the SRS requirements
export const api = {
  // Public / Common
  getProducts: async (filters?: any) => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate latency
    return MOCK_PRODUCTS;
  },
  
  getTopSellingProducts: async () => {
    await new Promise(resolve => setTimeout(resolve, 400));
    // Return items for the grid part of Top Selling
    return [MOCK_PRODUCTS[3], MOCK_PRODUCTS[5], MOCK_PRODUCTS[0], MOCK_PRODUCTS[1]];
  },

  getFeaturedProducts: async () => {
    await new Promise(resolve => setTimeout(resolve, 400));
    // Return items for the dark cards section
    return [MOCK_PRODUCTS[0], MOCK_PRODUCTS[1], MOCK_PRODUCTS[2]];
  },

  getProductById: async (id: number) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_PRODUCTS.find(p => p.id === id);
  },
  
  getSimilarProducts: async (productId: number) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_PRODUCTS.filter(p => p.id !== productId).slice(0, 3);
  },

  getRecommendedProducts: async (productId: number) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_PRODUCTS.slice(3, 6);
  },

  getCategories: async () => {
    return MOCK_CATEGORIES;
  },
  
  getSlides: async () => {
    return MOCK_SLIDES;
  },

  getFilters: async () => {
    return MOCK_FILTERS;
  },
  
  // Auth
  login: async (email: string) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const isVendor = email.includes('vendor');
    return {
      id: 123,
      name: "John Martin",
      email: email,
      role: isVendor ? 'vendor_owner' : 'customer',
      is_vendor: isVendor,
      completionPercentage: 80
    } as User;
  },
  
  // User/Cart
  getCart: async () => {
    return []; 
  },
  addToCart: async (productId: number, qty: number) => {
    return { success: true };
  },
  
  // Orders
  getOrders: async () => {
    return [
      { 
        id: "AMZ-12345678-987654", 
        date: "2024-02-15", 
        status: "processing", 
        total: 679.00, 
        trackingNumber: "TRK123456789",
        estimatedDelivery: "Today",
        items: [
          { productId: 1, name: "DFC - 4000 HybridDynamic Hybrid Rear Brake Pads", image: "https://images.unsplash.com/photo-1600706432502-76b1e601a746?auto=format&fit=crop&q=80&w=200", price: 679.00, quantity: 1 }
        ]
      },
      { 
        id: "AMZ-87654321-123456", 
        date: "2023-11-03", 
        status: "delivered", 
        total: 679.00, 
        items: [
           { productId: 1, name: "DFC - 4000 HybridDynamic Hybrid Rear Brake Pads", image: "https://images.unsplash.com/photo-1600706432502-76b1e601a746?auto=format&fit=crop&q=80&w=200", price: 679.00, quantity: 1 }
        ]
      },
      { 
        id: "AMZ-12345678-987654", 
        date: "2023-11-04", 
        status: "cancelled", 
        total: 475.00, 
        items: [
          { productId: 2, name: "Duralast 45084DL High-Performance Disc Brake Rotor", image: "https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?auto=format&fit=crop&q=80&w=200", price: 475.00, quantity: 1 }
        ]
      }
    ] as Order[];
  },
  
  // Vendor
  getVendorStats: async () => {
    return {
      revenue: 45231.89,
      orders: 2350,
      products: 124
    };
  }
};
