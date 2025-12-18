// Mock Data and simulated API calls based on the SRS and API list
// In a real app, these would be fetch calls to the backend

export interface Product {
  id: number;
  name: string;
  sku: string;
  price: number | null; // Price can be null if not authenticated
  image: string;
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
  attributes?: {
    surfaceType?: string;
    frictionalMaterial?: string;
    abutmentClipsIncluded?: boolean;
    brakeLubricantIncluded?: boolean;
    [key: string]: any;
  };
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'admin' | 'vendor_owner' | 'vendor_employee';
}

export interface Order {
  id: string;
  date: string;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: number;
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
    image: "https://images.unsplash.com/photo-1600706432502-76b1e601a746?auto=format&fit=crop&q=80&w=800",
    category: "Brakes",
    department: "Replacement Parts",
    description: "High performance ceramic brake kit for extreme stopping power.",
    condition: 'new',
    stock: 15,
    vendor: "AutoStop Pro",
    make: "Toyota",
    model: "Camry",
    year: 2022,
    rating: 4.8,
    attributes: {
      surfaceType: "Slotted",
      frictionalMaterial: "Ceramic",
      abutmentClipsIncluded: true,
      brakeLubricantIncluded: true
    }
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
    rating: 4.5
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
    rating: 4.9
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
    
    // Simulate unauthenticated user getting null prices randomly for demo purposes
    // In real app, this would be based on actual auth state
    // For now, we return as is, but specific page logic might mask it if needed
    // Or we can assume the user is "guest" by default for this mock if we wanted
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
    return {
      id: 123,
      name: "John Doe",
      email: email,
      role: email.includes('vendor') ? 'vendor_owner' : 'customer'
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
      { id: "ORD-2024-001", date: "2024-02-15", status: "delivered", total: 450.00, items: 1 },
      { id: "ORD-2024-002", date: "2024-02-18", status: "shipped", total: 125.00, items: 2 }
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
