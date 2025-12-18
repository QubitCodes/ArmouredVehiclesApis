import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertReviewSchema, insertCartItemSchema, insertOrderSchema, insertOrderItemSchema } from "@shared/schema";
import { z } from "zod";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        userType: 'customer' | 'vendor' | 'admin' | 'super_admin';
      };
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ===== PRODUCTS =====
  
  // Get all products with optional filters
  app.get("/api/products", async (req, res) => {
    try {
      const { categoryId, vendorId, search, minPrice, maxPrice } = req.query;
      
      const filters = {
        categoryId: categoryId ? parseInt(categoryId as string) : undefined,
        vendorId: vendorId as string | undefined,
        search: search as string | undefined,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      };

      const products = await storage.getProducts(filters);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Get featured products (for home page)
  app.get("/api/products/featured", async (req, res) => {
    try {
      const products = await storage.getProducts({});
      // Return first 3 products as featured
      res.json(products.slice(0, 3));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch featured products" });
    }
  });

  // Get top selling products (for home page)
  app.get("/api/products/top-selling", async (req, res) => {
    try {
      const products = await storage.getProducts({});
      // Return products 3-7 as top selling
      res.json(products.slice(3, 7));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch top selling products" });
    }
  });

  // Get product by ID
  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProductById(id);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Get similar products
  app.get("/api/products/:id/similar", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProductById(id);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Get products in the same category
      const similar = await storage.getProducts({
        categoryId: product.categoryId || undefined,
      });

      // Filter out the current product and limit to 6
      const filtered = similar.filter(p => p.id !== id).slice(0, 6);
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch similar products" });
    }
  });

  // Get recommended products
  app.get("/api/products/:id/recommended", async (req, res) => {
    try {
      const products = await storage.getProducts({});
      // Return random 6 products as recommendations
      res.json(products.slice(0, 6));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recommended products" });
    }
  });

  // Create product (vendor only)
  app.post("/api/products", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== 'vendor') {
        return res.status(403).json({ error: "Only vendors can create products" });
      }

      const validated = insertProductSchema.parse(req.body);
      const product = await storage.createProduct({
        ...validated,
        vendorId: req.user.id,
      });

      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  // ===== CATEGORIES =====
  
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // ===== REVIEWS =====
  
  // Get reviews for a product
  app.get("/api/products/:id/reviews", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const reviews = await storage.getReviewsByProductId(productId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // Create a review (authenticated users only)
  app.post("/api/products/:id/reviews", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const productId = parseInt(req.params.id);
      const validated = insertReviewSchema.parse({
        ...req.body,
        productId,
        userId: req.user.id,
      });

      const review = await storage.createReview(validated);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create review" });
    }
  });

  // ===== CART =====
  
  // Get user's cart
  app.get("/api/cart", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const cart = await storage.getCartByUserId(req.user.id);
      res.json(cart);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cart" });
    }
  });

  // Add item to cart
  app.post("/api/cart", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const validated = insertCartItemSchema.parse({
        ...req.body,
        userId: req.user.id,
      });

      const cartItem = await storage.addToCart(validated);
      res.status(201).json(cartItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to add to cart" });
    }
  });

  // Update cart item quantity
  app.patch("/api/cart/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const id = parseInt(req.params.id);
      const { quantity } = req.body;

      if (typeof quantity !== 'number' || quantity < 1) {
        return res.status(400).json({ error: "Invalid quantity" });
      }

      const updated = await storage.updateCartItem(id, quantity);
      if (!updated) {
        return res.status(404).json({ error: "Cart item not found" });
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update cart item" });
    }
  });

  // Remove item from cart
  app.delete("/api/cart/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const id = parseInt(req.params.id);
      await storage.removeFromCart(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to remove cart item" });
    }
  });

  // ===== ORDERS =====
  
  // Get user's orders
  app.get("/api/orders", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const orders = await storage.getOrdersByUserId(req.user.id);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Get order by ID
  app.get("/api/orders/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const order = await storage.getOrderById(req.params.id);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // Create order (checkout)
  app.post("/api/orders", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Order must contain at least one item" });
      }

      // Calculate total
      const total = items.reduce((sum: number, item: any) => {
        return sum + (parseFloat(item.price) * item.quantity);
      }, 0);

      const orderData = insertOrderSchema.parse({
        userId: req.user.id,
        status: 'pending',
        total: total.toString(),
      });

      const validatedItems = items.map((item: any) => 
        insertOrderItemSchema.parse(item)
      );

      const order = await storage.createOrder(orderData, validatedItems);

      // Clear user's cart after successful order
      await storage.clearCart(req.user.id);

      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // ===== VENDOR =====
  
  // Get vendor statistics
  app.get("/api/vendor/stats", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== 'vendor') {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const stats = await storage.getVendorStats(req.user.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor stats" });
    }
  });

  // Get vendor's products
  app.get("/api/vendor/products", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== 'vendor') {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const products = await storage.getProducts({ vendorId: req.user.id });
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor products" });
    }
  });

  // ===== USER / FILTERS =====
  
  // Get current user
  app.get("/api/user", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json(req.user);
  });

  // Get filter options
  app.get("/api/filters", async (req, res) => {
    try {
      const products = await storage.getProducts({});
      
      // Extract unique vendors
      const vendors = [...new Set(products.map(p => p.make))].filter(Boolean);
      
      // Extract unique departments
      const departments = [...new Set(products.map(p => p.department))].filter(Boolean);

      res.json({
        brands: vendors,
        departments,
        productTypes: [
          { name: "Brake Pads", image: "https://images.unsplash.com/photo-1600706432502-76b1e601a746?auto=format&fit=crop&q=80&w=200" },
          { name: "Disc Brake Pad", image: "https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?auto=format&fit=crop&q=80&w=200" },
          { name: "Brake Rotors", image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=200" },
          { name: "Parking Brake Shoe", image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=200" }
        ],
        surfaceTypes: ["Heavy Duty", "Tactical", "Standard", "Performance"],
        frictionalMaterials: ["Ceramic", "Semi-Metallic", "Organic", "Steel"]
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch filters" });
    }
  });

  return httpServer;
}
