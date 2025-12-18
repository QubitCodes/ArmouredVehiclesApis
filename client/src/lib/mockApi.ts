// Mock Data and simulated API calls based on the SRS and API list
// In a real app, these would be fetch calls to the backend

export interface Review {
  id: number;
  user: string;
  rating: number;
  date: string;
  comment: string;
  verifiedPurchase: boolean;
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
    title: "Premium Auto Parts Marketplace",
    subtitle: "Source OEM and aftermarket parts with bulk pricing and instant quotes.",
    buttonText: "Browse Catalog",
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=1600",
    link: "/products"
  },
  {
    id: 2,
    title: "New Performance Brakes Arrival",
    subtitle: "Upgrade your inventory with the latest ceramic brake kits.",
    buttonText: "Shop Brakes",
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=1600",
    link: "/products?category=Brakes"
  },
  {
    id: 3,
    title: undefined, // Optional title test
    subtitle: "Exclusive deals for verified workshops this week only.",
    buttonText: "View Deals",
    image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=1600",
    link: "/products"
  }
];

export const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: "Brakes", image: "https://images.unsplash.com/photo-1600706432502-76b1e601a746?auto=format&fit=crop&q=80&w=400", description: "Brake pads, rotors, and calipers" },
  { id: 2, name: "Lighting", image: "https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?auto=format&fit=crop&q=80&w=400", description: "Headlights, taillights, and bulbs" },
  { id: 3, name: "Engine", image: "https://images.unsplash.com/photo-1574360774620-192cb91b8606?auto=format&fit=crop&q=80&w=400", description: "Engine components and oil" },
  { id: 4, name: "Suspension", image: "https://images.unsplash.com/photo-1570188167980-d2d02c42345e?auto=format&fit=crop&q=80&w=400", description: "Shocks, struts, and coilovers" },
  { id: 5, name: "Interior", image: "https://images.unsplash.com/photo-1560965385-a7455d311394?auto=format&fit=crop&q=80&w=400", description: "Seats, mats, and accessories" },
  { id: 6, name: "Wheels & Tires", image: "https://images.unsplash.com/photo-1578844251758-2f71da645217?auto=format&fit=crop&q=80&w=400", description: "Rims and tires for all vehicles" }
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Performance Brake Kit - Ceramic",
    sku: "BRK-001-CER",
    price: 450.00,
    originalPrice: 520.00,
    image: "https://images.unsplash.com/photo-1600706432502-76b1e601a746?auto=format&fit=crop&q=80&w=800",
    gallery: [
      "https://images.unsplash.com/photo-1600706432502-76b1e601a746?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=800"
    ],
    category: "Brakes",
    department: "Replacement Parts",
    description: "High performance ceramic brake kit for extreme stopping power. Designed for daily driving and track use, providing superior heat dissipation and reduced brake fade.",
    condition: 'new',
    stock: 15,
    vendor: "AutoStop Pro",
    make: "Toyota",
    model: "Camry",
    year: 2022,
    rating: 4.8,
    reviewCount: 124,
    attributes: {
      surfaceType: "Slotted",
      frictionalMaterial: "Ceramic",
      abutmentClipsIncluded: true,
      brakeLubricantIncluded: true
    },
    features: [
      "Low dust ceramic formula",
      "Noise-free braking performance",
      "Extended rotor life",
      "Easy installation with included hardware",
      "Thermal scorched for fast break-in"
    ],
    specifications: {
      "Position": "Front & Rear",
      "Pad Material": "Ceramic",
      "Rotor Design": "Drilled & Slotted",
      "Included Hardware": "Yes",
      "Weight": "45 lbs"
    },
    vehicleFitment: {
      "Toyota": ["Camry (2018-2023)", "Avalon (2019-2022)", "RAV4 (2019-2023)"],
      "Lexus": ["ES350 (2019-2023)", "NX300 (2018-2021)"]
    },
    warranty: {
      period: "3 Years / 36,000 Miles",
      details: {
        "Coverage": "Defects in material and workmanship",
        "Exclusions": "Normal wear and tear, improper installation",
        "Claim Process": "Contact vendor support with proof of purchase"
      }
    },
    sellerInfo: {
      name: "AutoStop Pro",
      rating: 4.9,
      joinedDate: "2020",
      responseRate: "98%"
    },
    reviews: [
      { id: 1, user: "Mike T.", rating: 5, date: "2024-01-15", comment: "Excellent stopping power compared to OEM.", verifiedPurchase: true },
      { id: 2, user: "Sarah L.", rating: 4, date: "2023-12-20", comment: "Great pads, but installation instructions were vague.", verifiedPurchase: true }
    ]
  },
  {
    id: 2,
    name: "LED Headlight Assembly (Pair)",
    sku: "LGT-LED-002",
    price: 320.50,
    image: "https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?auto=format&fit=crop&q=80&w=800",
    category: "Lighting",
    department: "Accessories",
    description: "Bright LED headlight assembly, plug and play.",
    condition: 'new',
    stock: 8,
    vendor: "Lumina Auto",
    make: "Honda",
    model: "Civic",
    year: 2021,
    rating: 4.5,
    reviewCount: 56,
    features: ["Plug & Play", "6000K Color Temp", "50,000 Hour Life"],
    specifications: { "Bulb Type": "LED", "Voltage": "12V", "Color": "Cool White" },
    vehicleFitment: { "Honda": ["Civic (2016-2021)", "Accord (2018-2022)"] }
  },
  {
    id: 3,
    name: "Synthetic Motor Oil 5W-30 (5 Gallon)",
    sku: "OIL-SYN-003",
    price: 125.00,
    image: "https://images.unsplash.com/photo-1574360774620-192cb91b8606?auto=format&fit=crop&q=80&w=800",
    category: "Fluids",
    department: "Maintenance",
    description: "Premium synthetic oil for engine longevity.",
    condition: 'new',
    stock: 50,
    vendor: "Global Lubes",
    make: "Universal",
    model: "Universal",
    year: 2024,
    rating: 4.9,
    reviewCount: 203
  },
  {
    id: 4,
    name: "Alternator - Remanufactured",
    sku: "ALT-REM-004",
    price: 180.00,
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=800",
    category: "Engine",
    department: "Replacement Parts",
    description: "Quality remanufactured alternator with 1 year warranty.",
    condition: 'refurbished',
    stock: 3,
    vendor: "ReBuild Parts",
    make: "Ford",
    model: "F-150",
    year: 2019,
    rating: 4.2
  },
  {
    id: 5,
    name: "Sport Suspension Coilover Kit",
    sku: "SUS-SPT-005",
    price: 850.00,
    image: "https://images.unsplash.com/photo-1570188167980-d2d02c42345e?auto=format&fit=crop&q=80&w=800",
    category: "Suspension",
    department: "Performance",
    description: "Adjustable coilovers for track and street use.",
    condition: 'new',
    stock: 5,
    vendor: "TrackReady",
    make: "BMW",
    model: "M3",
    year: 2020,
    rating: 5.0,
    attributes: {
      surfaceType: "Performance",
      frictionalMaterial: "Steel"
    }
  },
  {
    id: 6,
    name: "Carbon Fiber Steering Wheel",
    sku: "INT-CF-006",
    price: 550.00,
    image: "https://images.unsplash.com/photo-1560965385-a7455d311394?auto=format&fit=crop&q=80&w=800",
    category: "Interior",
    department: "Accessories",
    description: "Ergonomic carbon fiber steering wheel with leather grips.",
    condition: 'new',
    stock: 12,
    vendor: "Luxury Mods",
    make: "BMW",
    model: "M4",
    year: 2023,
    rating: 4.7
  },
  {
    id: 7,
    name: "High Performance Tires (Set of 4)",
    sku: "WHL-TR-007",
    price: 1200.00,
    image: "https://images.unsplash.com/photo-1578844251758-2f71da645217?auto=format&fit=crop&q=80&w=800",
    category: "Wheels & Tires",
    department: "Replacement Parts",
    description: "All-season high performance tires for sports cars.",
    condition: 'new',
    stock: 20,
    vendor: "TireMaster",
    make: "Porsche",
    model: "911",
    year: 2022,
    rating: 4.8
  },
  {
    id: 8,
    name: "Ceramic Coating Kit",
    sku: "EXT-CC-008",
    price: 89.99,
    image: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&q=80&w=800",
    category: "Exterior",
    department: "Maintenance",
    description: "DIY ceramic coating kit for long-lasting paint protection.",
    condition: 'new',
    stock: 100,
    vendor: "ShineOn",
    make: "Universal",
    model: "Universal",
    year: 2024,
    rating: 4.3
  }
];

export const MOCK_FILTERS = {
  brands: ["AutoStop Pro", "Lumina Auto", "Global Lubes", "ReBuild Parts", "TrackReady", "Luxury Mods", "TireMaster", "ShineOn"],
  departments: ["Replacement Parts", "Accessories", "Maintenance", "Performance"],
  surfaceTypes: ["Slotted", "Drilled", "Smooth", "Performance"],
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
    // Just return a subset for demo
    return [MOCK_PRODUCTS[0], MOCK_PRODUCTS[2], MOCK_PRODUCTS[6], MOCK_PRODUCTS[7]];
  },

  getFeaturedProducts: async () => {
    await new Promise(resolve => setTimeout(resolve, 400));
    // Return a different subset
    return [MOCK_PRODUCTS[1], MOCK_PRODUCTS[4], MOCK_PRODUCTS[3], MOCK_PRODUCTS[5]];
  },

  getProductById: async (id: number) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_PRODUCTS.find(p => p.id === id);
  },
  
  getSimilarProducts: async (productId: number) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Return random 3 products excluding current
    return MOCK_PRODUCTS.filter(p => p.id !== productId).slice(0, 3);
  },

  getRecommendedProducts: async (productId: number) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    // Return random 3 products
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
