// Mock Data and simulated API calls based on the SRS and API list
// In a real app, these would be fetch calls to the backend

export interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  image: string;
  category: string;
  description: string;
  condition: 'new' | 'used' | 'refurbished';
  stock: number;
  vendor: string;
  make: string;
  model: string;
  year: number;
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

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Performance Brake Kit - Ceramic",
    sku: "BRK-001-CER",
    price: 450.00,
    image: "https://images.unsplash.com/photo-1600706432502-76b1e601a746?auto=format&fit=crop&q=80&w=800",
    category: "Brakes",
    description: "High performance ceramic brake kit for extreme stopping power.",
    condition: 'new',
    stock: 15,
    vendor: "AutoStop Pro",
    make: "Toyota",
    model: "Camry",
    year: 2022
  },
  {
    id: 2,
    name: "LED Headlight Assembly (Pair)",
    sku: "LGT-LED-002",
    price: 320.50,
    image: "https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?auto=format&fit=crop&q=80&w=800",
    category: "Lighting",
    description: "Bright LED headlight assembly, plug and play.",
    condition: 'new',
    stock: 8,
    vendor: "Lumina Auto",
    make: "Honda",
    model: "Civic",
    year: 2021
  },
  {
    id: 3,
    name: "Synthetic Motor Oil 5W-30 (5 Gallon)",
    sku: "OIL-SYN-003",
    price: 125.00,
    image: "https://images.unsplash.com/photo-1574360774620-192cb91b8606?auto=format&fit=crop&q=80&w=800",
    category: "Fluids",
    description: "Premium synthetic oil for engine longevity.",
    condition: 'new',
    stock: 50,
    vendor: "Global Lubes",
    make: "Universal",
    model: "Universal",
    year: 2024
  },
  {
    id: 4,
    name: "Alternator - Remanufactured",
    sku: "ALT-REM-004",
    price: 180.00,
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=800",
    category: "Engine",
    description: "Quality remanufactured alternator with 1 year warranty.",
    condition: 'refurbished',
    stock: 3,
    vendor: "ReBuild Parts",
    make: "Ford",
    model: "F-150",
    year: 2019
  },
  {
    id: 5,
    name: "Sport Suspension Coilover Kit",
    sku: "SUS-SPT-005",
    price: 850.00,
    image: "https://images.unsplash.com/photo-1570188167980-d2d02c42345e?auto=format&fit=crop&q=80&w=800",
    category: "Suspension",
    description: "Adjustable coilovers for track and street use.",
    condition: 'new',
    stock: 5,
    vendor: "TrackReady",
    make: "BMW",
    model: "M3",
    year: 2020
  }
];

export const MOCK_CATEGORIES = [
  "Brakes", "Lighting", "Engine", "Suspension", "Fluids", "Interior", "Exterior", "Wheels & Tires"
];

// Simulated API calls matching the SRS requirements
export const api = {
  // Public / Common
  getProducts: async (filters?: any) => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate latency
    return MOCK_PRODUCTS;
  },
  getProductById: async (id: number) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_PRODUCTS.find(p => p.id === id);
  },
  getCategories: async () => {
    return MOCK_CATEGORIES;
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
