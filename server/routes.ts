import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProductSchema, insertReviewSchema, insertCartItemSchema, insertOrderSchema, insertOrderItemSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// JWT Secret - in production use a proper secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'armoredmart-jwt-secret-key-2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'armoredmart-refresh-secret-key-2024';

// Token expiry times
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 14; // 14 days

interface JWTPayload {
  sub: string; // user id
  email: string;
  name: string;
  userType: 'customer' | 'vendor' | 'admin' | 'super_admin';
  sessionId: string;
  tokenVersion: number;
  type: 'access' | 'refresh';
}

// Extend Express Request type to include user and session
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        userType: 'customer' | 'vendor' | 'admin' | 'super_admin';
      };
      sessionId?: string;
    }
  }
}

// Generate access token (short-lived)
function generateAccessToken(user: { id: string; email: string; name: string; userType: string; tokenVersion?: number | null }, sessionId: string): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      userType: user.userType,
      sessionId,
      tokenVersion: user.tokenVersion || 0,
      type: 'access',
    } as JWTPayload,
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

// Generate refresh token (long-lived)
function generateRefreshToken(userId: string, sessionId: string, tokenVersion: number): string {
  return jwt.sign(
    {
      sub: userId,
      sessionId,
      tokenVersion,
      type: 'refresh',
    },
    JWT_REFRESH_SECRET,
    { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
  );
}

// Hash refresh token for storage
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Parse user agent to extract device info
function parseUserAgent(userAgent: string | undefined): string {
  if (!userAgent) return 'Unknown Device';
  
  let device = '';
  let browser = '';
  
  // Detect OS/Device
  if (userAgent.includes('iPhone')) device = 'iPhone';
  else if (userAgent.includes('iPad')) device = 'iPad';
  else if (userAgent.includes('Android')) device = 'Android';
  else if (userAgent.includes('Windows')) device = 'Windows';
  else if (userAgent.includes('Mac')) device = 'Mac';
  else if (userAgent.includes('Linux')) device = 'Linux';
  else device = 'Unknown';
  
  // Detect Browser
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
  else if (userAgent.includes('Edg')) browser = 'Edge';
  else browser = 'Browser';
  
  return `${browser} on ${device}`;
}

// Auth middleware - validates JWT access tokens
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Continue without user for optional auth
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    if (decoded.type !== 'access') {
      return next();
    }
    
    // Check if session is still valid
    const session = await storage.getSessionById(decoded.sessionId);
    if (!session || session.revokedAt || new Date(session.expiresAt) < new Date()) {
      return next();
    }
    
    // Verify token version matches user's current version
    const user = await storage.getUser(decoded.sub);
    if (!user || (user.tokenVersion || 0) !== decoded.tokenVersion) {
      return next(); // Token invalidated due to version mismatch
    }
    
    // Update last used timestamp (don't await to not slow down request)
    storage.updateSessionLastUsed(decoded.sessionId).catch(() => {});
    
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      userType: decoded.userType,
    };
    req.sessionId = decoded.sessionId;
    
    next();
  } catch (error) {
    // Token invalid or expired
    next();
  }
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
   *     description: |
   *       Creates a new user account and returns JWT access and refresh tokens.
   *       
   *       ## Pages / Sections Used
   *       - **Register Page** (`/auth/register`)
   *         - Registration Form - handles form submission and account creation
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

      // Create session in database first (with temporary hash)
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
      
      const session = await storage.createSession({
        userId: user.id,
        refreshTokenHash: 'temp', // Will be updated immediately
        userAgent: userAgent || null,
        ipAddress,
        deviceLabel: parseUserAgent(userAgent),
        expiresAt,
      });

      // Generate tokens with session ID
      const accessToken = generateAccessToken(user, session.id);
      const refreshToken = generateRefreshToken(user.id, session.id, user.tokenVersion || 0);

      res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          userType: user.userType,
        },
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes in seconds
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
   *     description: |
   *       Authenticates a user and returns JWT access and refresh tokens.
   *       
   *       ## Pages / Sections Used
   *       - **Login Page** (`/auth/login`)
   *         - Login Form - handles email/password authentication
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

      // Create session in database
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
      
      const session = await storage.createSession({
        userId: user.id,
        refreshTokenHash: 'temp',
        userAgent: userAgent || null,
        ipAddress,
        deviceLabel: parseUserAgent(userAgent),
        expiresAt,
      });

      // Generate tokens
      const accessToken = generateAccessToken(user, session.id);
      const refreshToken = generateRefreshToken(user.id, session.id, user.tokenVersion || 0);

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          userType: user.userType,
        },
        accessToken,
        refreshToken,
        expiresIn: 900,
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
   *     description: |
   *       Revokes the current session token.
   *       
   *       ## Pages / Sections Used
   *       - **Navbar** (all authenticated pages)
   *         - User Menu Dropdown - Logout button
   *       - **Profile Page** (`/account/profile`)
   *         - Sessions Section - when logging out current session
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logged out successfully
   */
  app.post("/api/auth/logout", async (req, res) => {
    if (req.sessionId) {
      await storage.revokeSession(req.sessionId);
    }
    res.json({ message: "Logged out successfully" });
  });

  /**
   * @swagger
   * /auth/me:
   *   get:
   *     tags: [Auth]
   *     summary: Get current user info
   *     description: |
   *       Returns the currently authenticated user's information.
   *       
   *       ## Pages / Sections Used
   *       - **Profile Page** (`/account/profile`)
   *         - Sidebar - displays user name, email, and profile completion
   *       - **Wishlist Page** (`/account/wishlist`)
   *         - Sidebar - displays user name, email, and profile completion
   *       - **Order Tracking Page** (`/account/orders/:id/track`)
   *         - Sidebar - displays user name and email
   *       - **Order Details Page** (`/account/orders/:id/details`)
   *         - Sidebar - displays user name and email
   *       - **Edit Profile Page** (`/account/profile/edit`)
   *         - Form pre-population with current user data
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Current user information
   *       401:
   *         description: Not authenticated
   */
  app.get("/api/auth/me", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.userType,
        completionPercentage: user.completionPercentage || 80
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user info" });
    }
  });

  /**
   * @swagger
   * /auth/profile:
   *   put:
   *     tags: [Auth]
   *     summary: Update user profile
   *     description: |
   *       Updates the currently authenticated user's profile information.
   *       
   *       ## Pages / Sections Used
   *       - **Edit Profile Page** (`/account/profile/edit`)
   *         - Profile Form - updates user name and email
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Profile updated successfully
   *       401:
   *         description: Not authenticated
   */
  app.put("/api/auth/profile", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { name, email } = req.body;
      
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update user in database
      const updatedUser = await storage.updateUserProfile(req.user.id, {
        name: name || user.name,
        email: email || user.email
      });

      res.json({
        id: updatedUser?.id || user.id,
        email: updatedUser?.email || user.email,
        name: updatedUser?.name || user.name,
        userType: updatedUser?.userType || user.userType,
        message: "Profile updated successfully"
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  /**
   * @swagger
   * /auth/refresh:
   *   post:
   *     tags: [Auth]
   *     summary: Refresh access token
   *     description: |
   *       Uses a refresh token to get a new access token.
   *       
   *       ## Pages / Sections Used
   *       - **All Authenticated Pages** (automatic background refresh)
   *         - API Client - automatically refreshes token 60 seconds before expiry
   *         - Retry Handler - refreshes token on 401 responses
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refreshToken]
   *             properties:
   *               refreshToken: { type: string }
   *     responses:
   *       200:
   *         description: New tokens generated
   *       401:
   *         description: Invalid or expired refresh token
   */
  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token is required" });
      }

      // Verify refresh token
      let decoded: any;
      try {
        decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      } catch (error) {
        return res.status(401).json({ error: "Invalid or expired refresh token" });
      }

      if (decoded.type !== 'refresh') {
        return res.status(401).json({ error: "Invalid token type" });
      }

      // Check if session is still valid
      const session = await storage.getSessionById(decoded.sessionId);
      if (!session || session.revokedAt || new Date(session.expiresAt) < new Date()) {
        return res.status(401).json({ error: "Session expired or revoked" });
      }

      // Get user and verify token version
      const user = await storage.getUser(decoded.sub);
      if (!user || (user.tokenVersion || 0) !== decoded.tokenVersion) {
        return res.status(401).json({ error: "Token has been invalidated" });
      }

      // Update session last used
      await storage.updateSessionLastUsed(session.id);

      // Generate new tokens
      const newAccessToken = generateAccessToken(user, session.id);
      const newRefreshToken = generateRefreshToken(user.id, session.id, user.tokenVersion || 0);

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900,
      });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(500).json({ error: "Failed to refresh token" });
    }
  });

  /**
   * @swagger
   * /auth/sessions:
   *   get:
   *     tags: [Auth]
   *     summary: Get user's active sessions
   *     description: |
   *       Returns a list of all active sessions for the current user.
   *       
   *       ## Pages / Sections Used
   *       - **Profile Page** (`/account/profile`)
   *         - Sessions Tab - displays list of active sessions with device info, IP address, and last active time
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of active sessions
   *       401:
   *         description: Not authenticated
   */
  app.get("/api/auth/sessions", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const sessions = await storage.getActiveSessionsByUserId(req.user.id);
      
      res.json(sessions.map(session => ({
        id: session.id,
        deviceLabel: session.deviceLabel,
        ipAddress: session.ipAddress,
        lastUsedAt: session.lastUsedAt,
        createdAt: session.createdAt,
        isCurrent: session.id === req.sessionId,
      })));
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  /**
   * @swagger
   * /auth/sessions/{id}:
   *   delete:
   *     tags: [Auth]
   *     summary: Revoke a specific session
   *     description: |
   *       Revokes a specific session, logging out that device.
   *       
   *       ## Pages / Sections Used
   *       - **Profile Page** (`/account/profile`)
   *         - Sessions Tab - "Revoke" button for each session card
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Session revoked
   *       401:
   *         description: Not authenticated
   *       404:
   *         description: Session not found
   */
  app.delete("/api/auth/sessions/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const sessionId = req.params.id;
      const session = await storage.getSessionById(sessionId);
      
      if (!session || session.userId !== req.user.id) {
        return res.status(404).json({ error: "Session not found" });
      }

      await storage.revokeSession(sessionId);
      res.json({ message: "Session revoked successfully" });
    } catch (error) {
      console.error("Error revoking session:", error);
      res.status(500).json({ error: "Failed to revoke session" });
    }
  });

  /**
   * @swagger
   * /auth/logout-all:
   *   post:
   *     tags: [Auth]
   *     summary: Logout from all devices
   *     description: |
   *       Revokes all sessions except the current one and increments token version.
   *       
   *       ## Pages / Sections Used
   *       - **Profile Page** (`/account/profile`)
   *         - Sessions Tab - "Log out all other devices" button
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: All sessions revoked
   *       401:
   *         description: Not authenticated
   */
  app.post("/api/auth/logout-all", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      // Revoke all sessions except current
      await storage.revokeAllUserSessions(req.user.id, req.sessionId);
      
      // Increment token version to invalidate all existing tokens
      await storage.updateUserTokenVersion(req.user.id);

      res.json({ message: "Logged out from all other devices" });
    } catch (error) {
      console.error("Error logging out all:", error);
      res.status(500).json({ error: "Failed to logout from all devices" });
    }
  });

  // ===== PRODUCTS =====

  /**
   * @swagger
   * /products:
   *   get:
   *     tags: [Products]
   *     summary: Get all products with optional filters
   *     description: |
   *       Returns a list of products, optionally filtered by category, search term, or price range.
   *       
   *       ## Pages / Sections Used
   *       - **Products Page** (`/products`)
   *         - Product Grid - main product listing with filter/sort
   *         - Search Suggestions - autocomplete dropdown
   *       - **Wishlist Page** (`/account/wishlist`)
   *         - Wishlist Grid - fetches product details for saved items
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
   *     description: |
   *       Returns a curated list of featured products to display on the home page.
   *       
   *       ## Pages / Sections Used
   *       - **Home Page** (`/`)
   *         - Featured Products Section - dark themed product cards carousel
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
   *     description: |
   *       Returns a list of best-selling products.
   *       
   *       ## Pages / Sections Used
   *       - **Home Page** (`/`)
   *         - Top Selling Products Section - beige themed grid carousel
   *       - **Products Page** (`/products`)
   *         - Sidebar - "Top Selling Products" carousel section
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
   *     description: |
   *       Returns detailed information about a specific product.
   *       
   *       ## Pages / Sections Used
   *       - **Product Details Page** (`/products/:id`)
   *         - Product Image Gallery - main image and thumbnails
   *         - Product Info Section - name, price, SKU, description
   *         - Specifications Tab - technical specifications
   *         - Vehicle Fitment Tab - compatible vehicles
   *         - Warranty Info - warranty details
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
   *     description: |
   *       Returns products similar to the specified product based on category.
   *       
   *       ## Pages / Sections Used
   *       - **Product Details Page** (`/products/:id`)
   *         - Right Sidebar - "Similar Products" list with thumbnails
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
   *     description: |
   *       Returns product recommendations for the user.
   *       
   *       ## Pages / Sections Used
   *       - **Product Details Page** (`/products/:id`)
   *         - Right Sidebar - "Recommended Products" grid with thumbnails
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
   *     description: |
   *       Creates a new product listing. Requires vendor authentication.
   *       
   *       ## Pages / Sections Used
   *       - **Vendor Dashboard** (`/vendor/products`) - _Not yet implemented in frontend_
   *         - Add Product Form - create new product listing
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
   *     description: |
   *       Returns a list of all product categories for navigation.
   *       
   *       ## Pages / Sections Used
   *       - **Home Page** (`/`)
   *         - Categories Section - category cards with images
   *       - **Products Page** (`/products`)
   *         - Filter Sidebar - category checkboxes for filtering
   *       - **Navbar** (all pages)
   *         - Categories Dropdown Menu - navigation links
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
   *     description: |
   *       Returns all reviews for a specific product.
   *       
   *       ## Pages / Sections Used
   *       - **Product Details Page** (`/products/:id`)
   *         - Reviews Tab - customer reviews list with ratings
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
   *     description: |
   *       Submits a new review for a product.
   *       
   *       ## Pages / Sections Used
   *       - **Product Details Page** (`/products/:id`)
   *         - Reviews Tab - "Write a Review" form (authenticated users only)
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
   *     description: |
   *       Returns all items in the user's shopping cart with product details.
   *       
   *       ## Pages / Sections Used
   *       - **Cart Page** (`/cart`)
   *         - Cart Items List - product cards with quantity controls
   *         - Order Summary - total calculation
   *       - **Checkout Page** (`/checkout`)
   *         - Order Review - summary before payment
   *       - **Navbar** (all authenticated pages)
   *         - Cart Icon Badge - displays item count
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
   *     description: |
   *       Adds a product to the user's shopping cart.
   *       
   *       ## Pages / Sections Used
   *       - **Product Details Page** (`/products/:id`)
   *         - Add to Cart Button - primary CTA in product info section
   *       - **Product Card** (Products Page, Home Page)
   *         - Quick Add to Cart icon button
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
   *     description: |
   *       Updates the quantity of an item in the cart.
   *       
   *       ## Pages / Sections Used
   *       - **Cart Page** (`/cart`)
   *         - Cart Item Row - Plus/Minus quantity buttons
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
   *     description: |
   *       Removes an item from the cart.
   *       
   *       ## Pages / Sections Used
   *       - **Cart Page** (`/cart`)
   *         - Cart Item Row - "Remove" link button
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
   *     description: |
   *       Creates a Stripe checkout session for payment processing.
   *       Returns checkout URL for Stripe-hosted checkout, or test mode indicator if Stripe is not configured.
   *       
   *       ## Pages / Sections Used
   *       - **Cart Page** (`/cart`)
   *         - "Proceed to Checkout" button - initiates Stripe checkout flow
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

      // Calculate order total
      const total = cartItems.reduce((sum, item) => 
        sum + (parseFloat(item.product.price) * item.quantity), 0);

      // Create order items from cart
      const orderItems = cartItems.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        image: item.product.image,
        price: item.product.price,
        quantity: item.quantity,
      }));

      // Create the order in the database
      const order = await storage.createOrder(
        {
          userId: req.user.id,
          status: 'pending',
          total: total.toString(),
          trackingNumber: `TRK${Date.now().toString(36).toUpperCase()}`,
          estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        orderItems
      );

      // Clear the cart after order creation
      await storage.clearCart(req.user.id);

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
        const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
        const baseUrl = replitDomain 
          ? `https://${replitDomain}` 
          : (req.headers.origin || `${req.protocol}://${req.get('host')}`);
        
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: lineItems,
          mode: 'payment',
          success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
          cancel_url: `${baseUrl}/cart`,
          customer_email: req.user.email,
          metadata: {
            userId: req.user.id,
            orderId: order.id,
          },
        });

        res.json({ url: session.url, orderId: order.id });
      } catch (stripeError: any) {
        console.log("Stripe not configured, using test mode:", stripeError.message);
        // Stripe not configured - return test mode response with order info
        res.json({ 
          testMode: true,
          orderId: order.id,
          message: "Order created successfully. Stripe is not configured - payments would work with valid Stripe credentials."
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
   *     description: |
   *       Returns a list of all orders placed by the authenticated user.
   *       
   *       ## Pages / Sections Used
   *       - **Profile Page** (`/account/profile`)
   *         - Orders Tab - order history list with status badges
   *         - Recent Orders Section - last 3 orders summary
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
   *     description: |
   *       Returns detailed information about a specific order.
   *       
   *       ## Pages / Sections Used
   *       - **Order Details Page** (`/orders/:id`) - _Not yet implemented in frontend_
   *         - Order Summary - items, totals, shipping info
   *         - Order Status - tracking information
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
   *     description: |
   *       Creates a new order from cart items after payment.
   *       
   *       ## Pages / Sections Used
   *       - **Checkout Success Page** (`/checkout/success`)
   *         - Order Confirmation - creates order after successful Stripe payment
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

  // ===== REFUNDS =====

  /**
   * @swagger
   * /refunds:
   *   get:
   *     tags: [Refunds]
   *     summary: Get user's refunds
   *     description: |
   *       Returns all refunds for the authenticated user.
   *       
   *       ## Pages / Sections Used
   *       - **Returns Page** (`/account/returns`)
   *         - Returns List - displays all refund requests
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of refunds
   *       401:
   *         description: Not authenticated
   */
  app.get("/api/refunds", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const refunds = await storage.getRefundsByUserId(req.user.id);
      res.json(refunds);
    } catch (error) {
      console.error("Error fetching refunds:", error);
      res.status(500).json({ error: "Failed to fetch refunds" });
    }
  });

  /**
   * @swagger
   * /refunds/{id}:
   *   get:
   *     tags: [Refunds]
   *     summary: Get refund details
   *     description: |
   *       Returns details for a specific refund including items.
   *       
   *       ## Pages / Sections Used
   *       - **Refund Details Page** (`/account/refunds/:id`)
   *         - Triggered Refunds - status, amount, payment method, dates
   *         - Triggered Items - products being refunded
   *         - Refund Breakup - popup showing per-item amounts
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Refund details
   *       404:
   *         description: Refund not found
   */
  app.get("/api/refunds/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const refund = await storage.getRefundById(req.params.id);
      
      if (!refund || refund.userId !== req.user.id) {
        return res.status(404).json({ error: "Refund not found" });
      }

      res.json(refund);
    } catch (error) {
      console.error("Error fetching refund:", error);
      res.status(500).json({ error: "Failed to fetch refund" });
    }
  });

  // ===== VENDOR =====

  /**
   * @swagger
   * /vendor/stats:
   *   get:
   *     tags: [Vendor]
   *     summary: Get vendor statistics
   *     description: |
   *       Returns sales statistics for the vendor dashboard.
   *       
   *       ## Pages / Sections Used
   *       - **Vendor Dashboard** (`/vendor`) - _Not yet implemented in frontend_
   *         - Stats Overview - revenue, orders, products count
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
   *     description: |
   *       Returns all products created by the authenticated vendor.
   *       
   *       ## Pages / Sections Used
   *       - **Vendor Dashboard** (`/vendor/products`) - _Not yet implemented in frontend_
   *         - Products Table - manage listings, inventory, pricing
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
   *     description: |
   *       Returns the currently authenticated user's information.
   *       
   *       ## Pages / Sections Used
   *       - **Navbar** (all pages)
   *         - User Menu - displays logged-in user info
   *       - **Profile Page** (`/account/profile`)
   *         - Account Details Section - user info display
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
   *     description: |
   *       Returns available filter options based on current product inventory.
   *       
   *       ## Pages / Sections Used
   *       - **Products Page** (`/products`)
   *         - Filter Sidebar - brands, departments, surface types, materials checkboxes
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
