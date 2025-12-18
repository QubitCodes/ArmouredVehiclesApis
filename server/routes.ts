import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProductSchema, insertReviewSchema, insertCartItemSchema, insertOrderSchema, insertOrderItemSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";

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

// Simple token storage (in production, use Redis or similar)
const sessions: Map<string, { userId: string; expiresAt: Date }> = new Map();

// Auth middleware
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without user for optional auth
  }

  const token = authHeader.substring(7);
  const session = sessions.get(token);

  if (!session || session.expiresAt < new Date()) {
    sessions.delete(token);
    return next();
  }

  // Fetch user and attach to request
  storage.getUser(session.userId).then(user => {
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.userType as 'customer' | 'vendor' | 'admin' | 'super_admin',
      };
    }
    next();
  }).catch(() => next());
}

// Generate simple token
function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Apply auth middleware to all routes
  app.use(authMiddleware);

  // ===== AUTH =====

  /**
   * @swagger
   * /auth/register:
   *   post:
   *     tags: [Auth]
   *     summary: Register a new user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, email, password, userType]
   *             properties:
   *               name: { type: string }
   *               email: { type: string, format: email }
   *               password: { type: string, minLength: 6 }
   *               userType: { type: string, enum: [customer, vendor] }
   *     responses:
   *       201:
   *         description: User created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       400:
   *         description: Validation error or email already exists
   */
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password, userType } = req.body;

      // Validate input
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        name,
        email,
        password: hashedPassword,
        userType: userType || 'customer',
      });

      // Generate session token
      const token = generateToken();
      sessions.set(token, {
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          userType: user.userType,
        },
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Login user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string }
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       401:
   *         description: Invalid credentials
   */
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Generate session token
      const token = generateToken();
      sessions.set(token, {
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          userType: user.userType,
        },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Logout user
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logged out successfully
   */
  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      sessions.delete(token);
    }
    res.json({ message: "Logged out successfully" });
  });

  // ===== PRODUCTS =====

  /**
   * @swagger
   * /products:
   *   get:
   *     tags: [Products]
   *     summary: Get all products with optional filters
   *     parameters:
   *       - in: query
   *         name: categoryId
   *         schema: { type: integer }
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *       - in: query
   *         name: minPrice
   *         schema: { type: number }
   *       - in: query
   *         name: maxPrice
   *         schema: { type: number }
   *     responses:
   *       200:
   *         description: List of products
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Product'
   */
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

  /**
   * @swagger
   * /products/featured:
   *   get:
   *     tags: [Products]
   *     summary: Get featured products for home page
   *     responses:
   *       200:
   *         description: List of featured products
   */
  app.get("/api/products/featured", async (req, res) => {
    try {
      const products = await storage.getProducts({});
      res.json(products.slice(0, 3));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch featured products" });
    }
  });

  /**
   * @swagger
   * /products/top-selling:
   *   get:
   *     tags: [Products]
   *     summary: Get top selling products
   *     responses:
   *       200:
   *         description: List of top selling products
   */
  app.get("/api/products/top-selling", async (req, res) => {
    try {
      const products = await storage.getProducts({});
      res.json(products.slice(3, 7));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch top selling products" });
    }
  });

  /**
   * @swagger
   * /products/{id}:
   *   get:
   *     tags: [Products]
   *     summary: Get product by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: Product details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Product'
   *       404:
   *         description: Product not found
   */
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

  /**
   * @swagger
   * /products/{id}/similar:
   *   get:
   *     tags: [Products]
   *     summary: Get similar products
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: List of similar products
   */
  app.get("/api/products/:id/similar", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProductById(id);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const similar = await storage.getProducts({
        categoryId: product.categoryId || undefined,
      });

      const filtered = similar.filter(p => p.id !== id).slice(0, 6);
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch similar products" });
    }
  });

  /**
   * @swagger
   * /products/{id}/recommended:
   *   get:
   *     tags: [Products]
   *     summary: Get recommended products
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: List of recommended products
   */
  app.get("/api/products/:id/recommended", async (req, res) => {
    try {
      const products = await storage.getProducts({});
      res.json(products.slice(0, 6));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recommended products" });
    }
  });

  /**
   * @swagger
   * /products:
   *   post:
   *     tags: [Products]
   *     summary: Create a new product (vendor only)
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Product'
   *     responses:
   *       201:
   *         description: Product created
   *       403:
   *         description: Vendor access required
   */
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

  /**
   * @swagger
   * /categories:
   *   get:
   *     tags: [Categories]
   *     summary: Get all categories
   *     responses:
   *       200:
   *         description: List of categories
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Category'
   */
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // ===== REVIEWS =====

  /**
   * @swagger
   * /products/{id}/reviews:
   *   get:
   *     tags: [Reviews]
   *     summary: Get reviews for a product
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: List of reviews
   */
  app.get("/api/products/:id/reviews", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const reviews = await storage.getReviewsByProductId(productId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  /**
   * @swagger
   * /products/{id}/reviews:
   *   post:
   *     tags: [Reviews]
   *     summary: Create a review (authenticated users only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [rating, comment]
   *             properties:
   *               rating: { type: integer, minimum: 1, maximum: 5 }
   *               comment: { type: string }
   *     responses:
   *       201:
   *         description: Review created
   *       401:
   *         description: Authentication required
   */
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

  /**
   * @swagger
   * /cart:
   *   get:
   *     tags: [Cart]
   *     summary: Get user's cart
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Cart items
   *       401:
   *         description: Authentication required
   */
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

  /**
   * @swagger
   * /cart:
   *   post:
   *     tags: [Cart]
   *     summary: Add item to cart
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [productId]
   *             properties:
   *               productId: { type: integer }
   *               quantity: { type: integer, default: 1 }
   *     responses:
   *       201:
   *         description: Item added to cart
   *       401:
   *         description: Authentication required
   */
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

  /**
   * @swagger
   * /cart/{id}:
   *   patch:
   *     tags: [Cart]
   *     summary: Update cart item quantity
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [quantity]
   *             properties:
   *               quantity: { type: integer, minimum: 1 }
   *     responses:
   *       200:
   *         description: Cart item updated
   */
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

  /**
   * @swagger
   * /cart/{id}:
   *   delete:
   *     tags: [Cart]
   *     summary: Remove item from cart
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       204:
   *         description: Item removed
   */
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

  // ===== CHECKOUT (Stripe Integration) =====

  /**
   * @swagger
   * /checkout/create-session:
   *   post:
   *     tags: [Checkout]
   *     summary: Create Stripe checkout session
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Checkout session URL or test mode indicator
   */
  app.post("/api/checkout/create-session", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Get cart items
      const cartItems = await storage.getCartByUserId(req.user.id);
      if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }

      // Try to get Stripe client
      try {
        const { getUncachableStripeClient } = await import("./stripeClient");
        const stripe = await getUncachableStripeClient();

        // Build line items from cart
        const lineItems = cartItems.map(item => ({
          price_data: {
            currency: 'aed',
            product_data: {
              name: item.product.name,
              images: [item.product.image],
              metadata: {
                productId: item.product.id.toString(),
                sku: item.product.sku,
              },
            },
            unit_amount: Math.round(parseFloat(item.product.price) * 100),
          },
          quantity: item.quantity,
        }));

        // Create checkout session
        const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: lineItems,
          mode: 'payment',
          success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/cart`,
          customer_email: req.user.email,
          metadata: {
            userId: req.user.id,
          },
        });

        res.json({ url: session.url });
      } catch (stripeError: any) {
        console.log("Stripe not configured, using test mode:", stripeError.message);
        // Stripe not configured - return test mode response
        res.json({ 
          testMode: true,
          message: "Stripe is not configured. This is a sample environment - payments would work with valid Stripe credentials."
        });
      }
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // ===== ORDERS =====

  /**
   * @swagger
   * /orders:
   *   get:
   *     tags: [Orders]
   *     summary: Get user's orders
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of orders
   */
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

  /**
   * @swagger
   * /orders/{id}:
   *   get:
   *     tags: [Orders]
   *     summary: Get order by ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Order details
   */
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

  /**
   * @swagger
   * /orders:
   *   post:
   *     tags: [Orders]
   *     summary: Create order (checkout)
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [items]
   *             properties:
   *               items:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     productId: { type: integer }
   *                     name: { type: string }
   *                     image: { type: string }
   *                     price: { type: string }
   *                     quantity: { type: integer }
   *     responses:
   *       201:
   *         description: Order created
   */
  app.post("/api/orders", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Order must contain at least one item" });
      }

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

  /**
   * @swagger
   * /vendor/stats:
   *   get:
   *     tags: [Vendor]
   *     summary: Get vendor statistics
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Vendor stats
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 revenue: { type: number }
   *                 orders: { type: integer }
   *                 products: { type: integer }
   */
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

  /**
   * @swagger
   * /vendor/products:
   *   get:
   *     tags: [Vendor]
   *     summary: Get vendor's products
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of vendor's products
   */
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

  /**
   * @swagger
   * /user:
   *   get:
   *     tags: [Auth]
   *     summary: Get current user
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Current user info
   *       401:
   *         description: Not authenticated
   */
  app.get("/api/user", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json(req.user);
  });

  /**
   * @swagger
   * /filters:
   *   get:
   *     tags: [Products]
   *     summary: Get filter options
   *     responses:
   *       200:
   *         description: Available filter options
   */
  app.get("/api/filters", async (req, res) => {
    try {
      const products = await storage.getProducts({});
      
      const vendors = [...new Set(products.map(p => p.make))].filter(Boolean);
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
