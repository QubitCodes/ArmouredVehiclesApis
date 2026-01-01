import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProductSchema, insertReviewSchema, insertCartItemSchema, insertOrderSchema, insertOrderItemSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendOtpEmail } from "./email";
// Multer and CSV parser are loaded dynamically to avoid type issues before install

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

function isVendorOrAdmin(user: Request["user"] | undefined): boolean {
  return !!user && (user.userType === 'vendor' || user.userType === 'admin' || user.userType === 'super_admin');
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
    { expiresIn: '6d' }
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

// Get IP address from request, handling x-forwarded-for header
function getClientIp(req: Request): string {
  const xForwardedFor = req.headers['x-forwarded-for'];
  const ip = req.ip || 
    (typeof xForwardedFor === 'string' ? xForwardedFor : 
     Array.isArray(xForwardedFor) ? xForwardedFor[0] : 
     'unknown');
  return ip || 'unknown';
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
      if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Create session in database
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      const userAgent = req.headers['user-agent'];
      const ipAddress = getClientIp(req);
      
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

  // ===== OTP LOGIN =====

  /**
   * @swagger
   * /auth/otp/login/start:
   *   post:
   *     tags: [Auth - OTP]
   *     summary: Start OTP login flow
   *     description: Sends a 6-digit OTP to the user's email for passwordless login
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email]
   *             properties:
   *               email: { type: string, format: email }
   *     responses:
   *       200:
   *         description: OTP sent successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 expiresIn: { type: integer, description: OTP expiry in seconds }
   *                 debugOtp: { type: string, description: Only in development mode }
   *       400:
   *         description: Email is required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   *       404:
   *         description: No account found with this email
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   */
  app.post("/api/auth/otp/login/start", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "No account found with this email" });
      }

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Delete any existing OTPs for this email (will use purpose-based lookup and delete)
      const existingOtp = await storage.getOtpVerification(email, 'email', 'login');
      if (existingOtp) {
        await storage.deleteOtpById(existingOtp.id);
      }

      // Store OTP
      await storage.createOtpVerification({
        identifier: email,
        code: otpCode,
        type: 'email',
        purpose: 'login',
        userId: user.id,
        expiresAt,
      });

      // Send OTP via centralized Resend helper
      try {
        await sendOtpEmail(email, otpCode, user.name || 'there');
      } catch (emailError) {
        console.error("Failed to send login OTP email:", emailError);
      }

      console.log(`[OTP] Login OTP for ${email}: ${otpCode}`);

      res.json({
        message: "Verification code sent to your email",
        expiresIn: 600,
        debugOtp: otpCode,
      });
    } catch (error) {
      console.error("OTP login start error:", error);
      res.status(500).json({ error: "Failed to start login" });
    }
  });

  /**
   * @swagger
   * /auth/otp/login/verify:
   *   post:
   *     tags: [Auth - OTP]
   *     summary: Verify OTP and complete login
   *     description: Verifies the OTP code and returns access/refresh tokens for authentication
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, code]
   *             properties:
   *               email: { type: string, format: email }
   *               code: { type: string, description: 6-digit OTP code }
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user: { $ref: '#/components/schemas/User' }
   *                 accessToken: { type: string }
   *                 refreshToken: { type: string }
   *                 expiresIn: { type: integer }
   *       400:
   *         description: Invalid or expired OTP
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   *                 attemptsRemaining: { type: integer }
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   */
  app.post("/api/auth/otp/login/verify", async (req, res) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({ error: "Email and code are required" });
      }

      // Find and validate OTP
      const otpRecord = await storage.getOtpVerification(email, 'email', 'login');
      if (!otpRecord) {
        return res.status(400).json({ error: "Invalid or expired verification code" });
      }

      if (new Date(otpRecord.expiresAt) < new Date()) {
        await storage.deleteOtpById(otpRecord.id);
        return res.status(400).json({ error: "Verification code has expired" });
      }

      if ((otpRecord.attempts || 0) >= 5) {
        await storage.deleteOtpById(otpRecord.id);
        return res.status(400).json({ error: "Too many attempts. Please request a new code." });
      }

      // Increment attempts
      await storage.incrementOtpAttempts(otpRecord.id);

      // Check if code matches
      if (otpRecord.code !== code) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      // Get user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Delete OTP
      await storage.deleteOtpById(otpRecord.id);

      // Create session
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
      console.error("OTP login verify error:", error);
      res.status(500).json({ error: "Failed to verify login" });
    }
  });

  // ===== OTP AUTHENTICATION =====

  /**
   * @swagger
   * /auth/otp/register/start:
   *   post:
   *     tags: [Auth - OTP]
   *     summary: Start OTP registration flow
   *     description: |
   *       Creates a pending user and sends OTP to email for verification.
   *       If the email already exists but is NOT verified, the registration is resumed
   *       using the existing user data (name, username) from the database.
   *       Only blocks registration if the email is already verified.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, username, name]
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               username:
   *                 type: string
   *               name:
   *                 type: string
   *               userType:
   *                 type: string
   *                 enum: [vendor, customer]
   *                 default: vendor
   *     responses:
   *       200:
   *         description: Resuming incomplete registration
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 userId:
   *                   type: string
   *                 email:
   *                   type: string
   *                 name:
   *                   type: string
   *                 username:
   *                   type: string
   *                 resuming:
   *                   type: boolean
   *                 expiresIn:
   *                   type: integer
   *                 debugOtp:
   *                   type: string
   *                   description: Only included in development mode
   *       201:
   *         description: New registration started
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 userId: { type: string }
   *                 email: { type: string }
   *                 name: { type: string }
   *                 username: { type: string }
   *                 expiresIn: { type: integer }
   *                 debugOtp: { type: string, description: Only in development mode }
   *       400:
   *         description: Email already verified or validation error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   *                 continueToPhone: { type: boolean, description: If true, redirect to phone verification step }
   */
  app.post("/api/auth/otp/register/start", async (req, res) => {
    try {
      const { email, username, name, userType } = req.body;

      if (!email || !username || !name) {
        return res.status(400).json({ error: "Email, username, and name are required" });
      }

      let user;
      let resumingRegistration = false;

      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        // If email is verified but phone is NOT verified, they can continue registration
        if (existingEmail.emailVerified && !existingEmail.phoneVerified) {
          return res.status(200).json({ 
            message: "Email verified. Please continue to phone verification.",
            userId: existingEmail.id,
            email: existingEmail.email,
            name: existingEmail.name,
            username: existingEmail.username,
            continueToPhone: true,
            onboardingStep: existingEmail.onboardingStep || 0,
          });
        }
        // If both email and phone are verified, they're fully registered
        if (existingEmail.emailVerified && existingEmail.phoneVerified) {
          return res.status(400).json({ error: "Email already registered. Please login instead." });
        }
        // Email exists but not verified - resume registration with existing data
        user = existingEmail;
        resumingRegistration = true;
      } else {
        // Check if username already exists (but only for new registrations)
        const existingUsername = await storage.getUserByUsername(username);
        if (existingUsername && existingUsername.emailVerified) {
          return res.status(400).json({ error: "Username already taken" });
        }

        // Create user with onboarding step 1 (email not verified)
        user = await storage.createUser({
          name,
          email,
          username,
          userType: userType || 'vendor',
        });
      }

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP (creates new or replaces existing)
      await storage.createOtpVerification({
        identifier: email,
        code: otpCode,
        type: 'email',
        purpose: 'registration',
        userId: user.id,
        expiresAt,
      });

      // Send email with OTP code via Resend
      const emailSent = await sendOtpEmail(email, otpCode, user.name);
      
      // In development or if email fails, include OTP in response for testing
      // const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
      
      res.status(resumingRegistration ? 200 : 201).json({
        message: resumingRegistration 
          ? (emailSent ? "Resuming registration. OTP sent to email" : "Resuming registration. OTP generated (email not configured)")
          : (emailSent ? "OTP sent to email" : "OTP generated (email not configured)"),
        userId: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        resuming: resumingRegistration,
        expiresIn: 600,
        debugOtp: otpCode,
      });
    } catch (error) {
      console.error("OTP registration start error:", error);
      res.status(500).json({ error: "Failed to start registration" });
    }
  });

  /**
   * @swagger
   * /auth/otp/verify-email:
   *   post:
   *     tags: [Auth - OTP]
   *     summary: Verify email OTP
   *     description: Verifies the OTP sent to email and marks the user's email as verified
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, code]
   *             properties:
   *               userId: { type: string }
   *               email: { type: string, format: email }
   *               code: { type: string, description: 6-digit OTP code }
   *     responses:
   *       200:
   *         description: Email verified successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 userId: { type: string }
   *                 nextStep: { type: string, example: phone_number }
   *       400:
   *         description: Invalid OTP or too many attempts
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   *                 attemptsRemaining: { type: integer }
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   */
  app.post("/api/auth/otp/verify-email", async (req, res) => {
    try {
      const { userId, email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({ error: "Email and code are required" });
      }

      // Get the OTP verification record
      const otpRecord = await storage.getOtpVerification(email, 'email', 'registration');
      if (!otpRecord) {
        return res.status(400).json({ error: "No pending verification found" });
      }

      // Check if expired
      if (new Date() > new Date(otpRecord.expiresAt)) {
        return res.status(400).json({ error: "OTP has expired" });
      }

      // Check attempts (max 5)
      if ((otpRecord.attempts || 0) >= 5) {
        return res.status(400).json({ error: "Too many attempts. Please request a new code." });
      }

      // Verify code
      if (otpRecord.code !== code) {
        await storage.incrementOtpAttempts(otpRecord.id);
        return res.status(400).json({ error: "Invalid OTP code" });
      }

      // Mark OTP as verified
      await storage.markOtpVerified(otpRecord.id);

      // Update user email verification status
      const targetUserId = userId || otpRecord.userId;
      if (targetUserId) {
        await storage.updateUserVerificationStatus(targetUserId, 'emailVerified', true);
        await storage.updateUserOnboardingStep(targetUserId, 2);
      }

      res.json({
        message: "Email verified successfully",
        userId: targetUserId,
        nextStep: "phone_number",
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  /**
   * @swagger
   * /auth/otp/resend-email:
   *   post:
   *     tags: [Auth - OTP]
   *     summary: Resend email OTP
   *     description: Generates and sends a new 6-digit OTP to the user's email
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email]
   *             properties:
   *               email: { type: string, format: email }
   *               userId: { type: string }
   *     responses:
   *       200:
   *         description: New OTP sent
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 expiresIn: { type: integer }
   *                 debugOtp: { type: string, description: Only in development mode }
   *       400:
   *         description: Email is required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   *       404:
   *         description: User not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   */
  app.post("/api/auth/otp/resend-email", async (req, res) => {
    try {
      const { email, userId } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Generate new 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store new OTP
      await storage.createOtpVerification({
        identifier: email,
        code: otpCode,
        type: 'email',
        purpose: 'registration',
        userId: userId || null,
        expiresAt,
      });

      // Get user name for email template
      let userName = "User";
      if (userId) {
        const user = await storage.getUser(userId);
        if (user) userName = user.name;
      }

      // Send email with OTP code via Resend
      const emailSent = await sendOtpEmail(email, otpCode, userName);
      
      // In development or if email fails, include OTP in response for testing
      // const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';

      res.json({
        message: emailSent ? "OTP resent to email" : "OTP generated (email not configured)",
        expiresIn: 600,
        debugOtp: otpCode,
      });
    } catch (error) {
      console.error("Email OTP resend error:", error);
      res.status(500).json({ error: "Failed to resend OTP" });
    }
  });

  /**
   * @swagger
   * /auth/otp/set-phone:
   *   post:
   *     tags: [Auth - OTP]
   *     summary: Set phone number and send OTP
   *     description: |
   *       Updates user phone number and sends OTP for verification.
   *       Only blocks if the phone is already verified by a different user.
   *       Unverified phone numbers can be reused/overwritten.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [userId, phone, countryCode]
   *             properties:
   *               userId:
   *                 type: string
   *               phone:
   *                 type: string
   *               countryCode:
   *                 type: string
   *                 example: "+1"
   *     responses:
   *       200:
   *         description: OTP sent to phone
   *       400:
   *         description: Phone already verified by another user
   */
  app.post("/api/auth/otp/set-phone", async (req, res) => {
    try {
      const { userId, phone, countryCode } = req.body;

      if (!userId || !phone || !countryCode) {
        return res.status(400).json({ error: "User ID, phone number, and country code are required" });
      }

      // Check if phone already exists and is verified by another user
      const fullPhone = `${countryCode}${phone}`;
      const existingPhone = await storage.getUserByPhone(fullPhone);
      if (existingPhone && existingPhone.id !== userId && existingPhone.phoneVerified) {
        return res.status(400).json({ error: "Phone number already registered" });
      }

      // Update user phone
      await storage.updateUserPhone(userId, fullPhone, countryCode);
      await storage.updateUserOnboardingStep(userId, 3);

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP
      await storage.createOtpVerification({
        identifier: fullPhone,
        code: otpCode,
        type: 'phone',
        purpose: 'verify_phone',
        userId,
        expiresAt,
      });

      // TODO: Send SMS with OTP code via SMS service (Firebase/Twilio)
      console.log(`[OTP] Phone OTP for ${fullPhone}: ${otpCode}`);
      
      // In development mode, include OTP in response for testing
      // const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';

      res.json({
        message: "OTP sent to phone",
        expiresIn: 600,
        debugOtp: otpCode,
      });
    } catch (error) {
      console.error("Set phone error:", error);
      res.status(500).json({ error: "Failed to set phone number" });
    }
  });

  /**
   * @swagger
   * /auth/otp/verify-phone:
   *   post:
   *     tags: [Auth - OTP]
   *     summary: Verify phone OTP
   *     description: |
   *       Verifies the OTP sent to phone and completes registration.
   *       Supports two verification methods:
   *       1. Firebase Phone Auth - Pass `firebaseUid` (trusted, skips backend OTP check)
   *       2. Backend OTP - Pass `code` for fallback verification
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [userId, phone]
   *             properties:
   *               userId:
   *                 type: string
   *               phone:
   *                 type: string
   *               code:
   *                 type: string
   *                 description: 6-digit OTP code (for backend verification)
   *               firebaseUid:
   *                 type: string
   *                 description: Firebase user UID (for Firebase phone auth)
   *     responses:
   *       200:
   *         description: Phone verified, registration complete
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 user:
   *                   type: object
   *                 accessToken:
   *                   type: string
   *                 refreshToken:
   *                   type: string
   *       400:
   *         description: Invalid OTP or missing required fields
   */
  app.post("/api/auth/otp/verify-phone", async (req, res) => {
    try {
      const { userId, phone, code, firebaseUid } = req.body;

      // Prefer the phone stored on the user (includes country code) for OTP lookup
      const userRecord = userId ? await storage.getUser(userId) : undefined;
      const identifierPhone = userRecord?.phone || phone;

      if (!identifierPhone) {
        return res.status(400).json({ error: "Phone is required" });
      }

      // If Firebase UID is provided, we trust Firebase's verification
      // Otherwise, fall back to backend OTP verification
      if (firebaseUid) {
        // Firebase has already verified the phone number
        console.log(`[OTP] Phone verified via Firebase for ${identifierPhone}, UID: ${firebaseUid}`);
      } else if (code) {
        // Fallback to backend OTP verification
        const otpRecord = await storage.getOtpVerification(identifierPhone, 'phone', 'verify_phone');
        console.log("OTP Record:", otpRecord);
        if (!otpRecord) {
          return res.status(400).json({ error: "No pending verification found" });
        }

        if (new Date() > new Date(otpRecord.expiresAt)) {
          return res.status(400).json({ error: "OTP has expired" });
        }

        if ((otpRecord.attempts || 0) >= 5) {
          return res.status(400).json({ error: "Too many attempts. Please request a new code." });
        }

        if (otpRecord.code !== code) {
          await storage.incrementOtpAttempts(otpRecord.id);
          return res.status(400).json({ error: "Invalid OTP code" });
        }

        await storage.markOtpVerified(otpRecord.id);
      } else {
        return res.status(400).json({ error: "Code or Firebase UID is required" });
      }

      // Update user phone verification status and complete onboarding
      if (userId) {
        await storage.updateUserVerificationStatus(userId, 'phoneVerified', true);
        await storage.updateUserOnboardingStep(userId, 4);
        
        // Store Firebase UID if provided
        if (firebaseUid) {
          await storage.updateUserFirebaseUid(userId, firebaseUid);
        }
      }

      // Create session and generate tokens
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

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

      const accessToken = generateAccessToken(user, session.id);
      const refreshToken = generateRefreshToken(user.id, session.id, user.tokenVersion || 0);

      res.json({
        message: "Phone verified successfully. Registration complete!",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          userType: user.userType,
          emailVerified: true,
          phoneVerified: true,
        },
        accessToken,
        refreshToken,
        expiresIn: 900,
      });
    } catch (error) {
      console.error("Phone verification error:", error);
      res.status(500).json({ error: "Failed to verify phone" });
    }
  });

  /**
   * @swagger
   * /auth/otp/resend-phone:
   *   post:
   *     tags: [Auth - OTP]
   *     summary: Resend phone OTP
   *     description: Generates and sends a new 6-digit OTP to the user's phone number
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [phone]
   *             properties:
   *               phone: { type: string, description: Full phone number including country code }
   *               userId: { type: string }
   *     responses:
   *       200:
   *         description: New OTP sent
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 expiresIn: { type: integer }
   *                 debugOtp: { type: string, description: Only in development mode }
   *       400:
   *         description: Phone is required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   */
  app.post("/api/auth/otp/resend-phone", async (req, res) => {
    try {
      const { phone, userId } = req.body;

      if (!phone) {
        return res.status(400).json({ error: "Phone is required" });
      }

      // Generate new 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store new OTP
      await storage.createOtpVerification({
        identifier: phone,
        code: otpCode,
        type: 'phone',
        purpose: 'verify_phone',
        userId: userId || null,
        expiresAt,
      });

      // TODO: Send SMS with OTP code
      console.log(`[OTP] Resent Phone OTP for ${phone}: ${otpCode}`);
      
      // In development mode, include OTP in response for testing
      // const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';

      res.json({
        message: "OTP resent to phone",
        expiresIn: 600,
        debugOtp: otpCode,
      });
    } catch (error) {
      console.error("Phone OTP resend error:", error);
      res.status(500).json({ error: "Failed to resend OTP" });
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
        phone: user.phone,
        countryCode: user.countryCode,
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

  // ===== VENDOR ONBOARDING ROUTES =====

  /**
   * @swagger
   * /vendor/onboarding/profile:
   *   get:
   *     tags: [Vendor - Onboarding]
   *     summary: Get vendor onboarding profile
   *     description: Retrieves the current vendor's onboarding profile and user information
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Vendor profile and user information
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 profile:
   *                   $ref: '#/components/schemas/UserProfile'
   *                 user:
   *                   type: object
   *                   properties:
   *                     id: { type: string }
   *                     name: { type: string }
   *                     email: { type: string }
   *                     phone: { type: string }
   *                     userType: { type: string }
   *                     emailVerified: { type: boolean }
   *                     phoneVerified: { type: boolean }
   *                     onboardingStep: { type: integer }
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   */
  app.get("/api/vendor/onboarding/profile", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const profile = await storage.getUserProfile(req.user.id);
      const user = await storage.getUser(req.user.id);
      
      res.json({
        profile: profile || null,
        user: {
          id: user?.id,
          name: user?.name,
          email: user?.email,
          phone: user?.phone,
          userType: user?.userType,
          emailVerified: user?.emailVerified,
          phoneVerified: user?.phoneVerified,
          onboardingStep: user?.onboardingStep,
        }
      });
    } catch (error) {
      console.error("Error fetching vendor profile:", error);
      res.status(500).json({ error: "Failed to fetch vendor profile" });
    }
  });

  /**
   * @swagger
   * /vendor/onboarding/step0:
   *   post:
   *     tags: [Vendor - Onboarding]
   *     summary: Save Step 0 - Initial Store Creation
   *     description: Creates or updates the initial vendor store profile with basic company information
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [country, companyName, companyEmail, companyPhone]
   *             properties:
   *               country: { type: string, description: ISO country code }
   *               companyName: { type: string }
   *               companyEmail: { type: string, format: email }
   *               companyPhone: { type: string }
    *               companyPhoneCountryCode: { type: string, example: "+971" }
    *               typeOfBuyer: { type: string, nullable: true, enum: ['individual', 'business', 'government', 'reseller', 'manufacturer', 'distributor', 'other'], description: 'Optional - type of buyer (nullable). Applicable for customers.' }
   *     responses:
   *       200:
   *         description: Store created/updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 profile: { $ref: '#/components/schemas/UserProfile' }
   *                 nextStep: { type: integer }
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   */
  app.post("/api/vendor/onboarding/step0", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { country, companyName, companyEmail, companyPhone, companyPhoneCountryCode, typeOfBuyer } = req.body;
      // typeOfBuyer is only applicable for customers; ensure it's nullable
      const typeOfBuyerValue = req.user?.userType === 'customer' ? (typeOfBuyer ?? null) : null;
      
      // Check if profile exists
      let profile = await storage.getUserProfile(req.user.id);
      
      if (profile) {
        // Update existing profile
        profile = await storage.updateUserProfile(req.user.id, {
          country,
          companyName,
          companyEmail,
          companyPhone,
          companyPhoneCountryCode,
          typeOfBuyer: typeOfBuyerValue,
          currentStep: 1,
          onboardingStatus: 'in_progress',
        });
      } else {
        // Create new profile
        profile = await storage.createUserProfile({
          userId: req.user.id,
          country,
          companyName,
          companyEmail,
          companyPhone,
          companyPhoneCountryCode,
          typeOfBuyer: typeOfBuyerValue,
          currentStep: 1,
          onboardingStatus: 'in_progress',
        });
      }

      // Update user onboarding step
      await storage.updateUserOnboardingStep(req.user.id, 5);

      res.json({
        message: "Store created successfully",
        profile,
        nextStep: 1,
      });
    } catch (error) {
      console.error("Error saving step 0:", error);
      res.status(500).json({ error: "Failed to create store" });
    }
  });

  /**
   * @swagger
   * /vendor/onboarding/step1:
   *   post:
   *     tags: [Vendor - Onboarding]
   *     summary: Save Step 1 - Company Registration Details
   *     description: Saves company registration and legal entity information
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               countryOfRegistration: { type: string }
   *               registeredCompanyName: { type: string }
   *               tradeBrandName: { type: string }
   *               yearOfEstablishment: { type: integer }
   *               legalEntityId: { type: string }
   *               legalEntityIssueDate: { type: string, format: date }
   *               legalEntityExpiryDate: { type: string, format: date }
   *               cityOfficeAddress: { type: string }
   *               officialWebsite: { type: string }
   *               entityType: { type: string, enum: [manufacturer, distributor, wholesaler, retailer, importer, exporter, other] }
   *               dunsNumber: { type: string }
   *               vatCertificateUrl: { type: string }
   *               taxVatNumber: { type: string }
   *               taxIssuingDate: { type: string, format: date }
   *               taxExpiryDate: { type: string, format: date }
   *     responses:
   *       200:
   *         description: Step 1 saved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 profile: { $ref: '#/components/schemas/UserProfile' }
   *                 nextStep: { type: integer }
   *       400:
   *         description: Please complete step 0 first
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   */
  app.post("/api/vendor/onboarding/step1", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { 
        countryOfRegistration,
        registeredCompanyName,
        tradeBrandName,
        yearOfEstablishment,
        legalEntityId,
        legalEntityIssueDate,
        legalEntityExpiryDate,
        cityOfficeAddress,
        officialWebsite,
        entityType,
        dunsNumber,
        vatCertificateUrl,
        taxVatNumber,
        taxIssuingDate,
        taxExpiryDate,
      } = req.body;
      
      // Check if profile exists
      let profile = await storage.getUserProfile(req.user.id);
      
      if (profile) {
        // Update existing profile
        profile = await storage.updateUserProfile(req.user.id, {
          countryOfRegistration,
          registeredCompanyName,
          tradeBrandName,
          yearOfEstablishment: yearOfEstablishment ? parseInt(yearOfEstablishment) : null,
          legalEntityId,
          legalEntityIssueDate,
          legalEntityExpiryDate,
          cityOfficeAddress,
          officialWebsite,
          entityType,
          dunsNumber,
          vatCertificateUrl,
          taxVatNumber,
          taxIssuingDate,
          taxExpiryDate,
          currentStep: 2,
          onboardingStatus: 'in_progress',
        });
      } else {
        return res.status(400).json({ error: "Please complete step 0 first" });
      }

      // Update user onboarding step
      await storage.updateUserOnboardingStep(req.user.id, 5); // Move past OTP steps to onboarding

      res.json({
        message: "Step 1 saved successfully",
        profile,
        nextStep: 2,
      });
    } catch (error) {
      console.error("Error saving step 1:", error);
      res.status(500).json({ error: "Failed to save store details" });
    }
  });

  /**
   * @swagger
   * /vendor/onboarding/step2:
   *   post:
   *     tags: [Vendor - Onboarding]
   *     summary: Save Step 2 - Authorized Contact Details
   *     description: Saves authorized contact person information and terms acceptance
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [contactFullName, termsAccepted]
   *             properties:
   *               contactFullName: { type: string }
   *               contactJobTitle: { type: string }
   *               contactWorkEmail: { type: string, format: email }
   *               contactIdDocumentUrl: { type: string }
   *               contactMobile: { type: string }
   *               contactMobileCountryCode: { type: string }
   *               termsAccepted: { type: boolean }
   *     responses:
   *       200:
   *         description: Step 2 saved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 profile: { $ref: '#/components/schemas/UserProfile' }
   *                 nextStep: { type: integer }
   *       400:
   *         description: Terms must be accepted
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   */
  app.post("/api/vendor/onboarding/step2", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const {
        contactFullName,
        contactJobTitle,
        contactWorkEmail,
        contactIdDocumentUrl,
        contactMobile,
        contactMobileCountryCode,
        termsAccepted,
      } = req.body;

      if (!termsAccepted) {
        return res.status(400).json({ error: "You must confirm the accuracy of information" });
      }
      
      const profile = await storage.updateUserProfile(req.user.id, {
        contactFullName,
        contactJobTitle,
        contactWorkEmail,
        contactIdDocumentUrl,
        contactMobile,
        contactMobileCountryCode,
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        currentStep: 3,
        onboardingStatus: 'in_progress',
      });

      res.json({
        message: "Step 2 saved successfully",
        profile,
        nextStep: 3,
      });
    } catch (error) {
      console.error("Error saving step 2:", error);
      res.status(500).json({ error: "Failed to save contact details" });
    }
  });

  /**
   * @swagger
   * /vendor/onboarding/step3:
   *   post:
   *     tags: [Vendor - Onboarding]
   *     summary: Save Step 3 - Business & Compliance
   *     description: Saves business nature, compliance information, and required licenses
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [natureOfBusiness, endUseMarkets, businessLicenseUrl, complianceTermsAccepted]
   *             properties:
   *               natureOfBusiness: { type: array, items: { type: string } }
   *               controlledDualUseItems: { type: string }
   *               licenseTypes: { type: array, items: { type: string } }
   *               endUseMarkets: { type: array, items: { type: string } }
   *               operatingCountries: { type: array, items: { type: string } }
   *               isOnSanctionsList: { type: boolean }
   *               businessLicenseUrl: { type: string }
   *               defenseApprovalUrl: { type: string }
   *               companyProfileUrl: { type: string }
   *               complianceTermsAccepted: { type: boolean }
   *     responses:
   *       200:
   *         description: Step 3 saved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 profile: { $ref: '#/components/schemas/UserProfile' }
   *                 nextStep: { type: integer }
   *       400:
   *         description: Validation error (missing required fields)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   */
  app.post("/api/vendor/onboarding/step3", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const {
        natureOfBusiness,
        controlledDualUseItems,
        licenseTypes,
        endUseMarkets,
        operatingCountries,
        isOnSanctionsList,
        businessLicenseUrl,
        defenseApprovalUrl,
        companyProfileUrl,
        complianceTermsAccepted,
      } = req.body;

      if (!complianceTermsAccepted) {
        return res.status(400).json({ error: "You must accept the compliance terms" });
      }

      if (!natureOfBusiness || natureOfBusiness.length === 0) {
        return res.status(400).json({ error: "Please select at least one nature of business" });
      }

      if (!endUseMarkets || endUseMarkets.length === 0) {
        return res.status(400).json({ error: "Please select at least one end-use market" });
      }

      if (!businessLicenseUrl) {
        return res.status(400).json({ error: "Business license is required" });
      }
      
      const profile = await storage.updateUserProfile(req.user.id, {
        natureOfBusiness,
        controlledDualUseItems,
        licenseTypes,
        endUseMarkets,
        operatingCountries,
        isOnSanctionsList: isOnSanctionsList === true,
        businessLicenseUrl,
        defenseApprovalUrl,
        companyProfileUrl,
        complianceTermsAccepted: true,
        complianceTermsAcceptedAt: new Date(),
        currentStep: 4,
        onboardingStatus: 'in_progress',
      });

      res.json({
        message: "Step 3 saved successfully",
        profile,
        nextStep: 4,
      });
    } catch (error) {
      console.error("Error saving step 3:", error);
      res.status(500).json({ error: "Failed to save business & compliance details" });
    }
  });

  /**
   * @swagger
   * /vendor/onboarding/step4:
   *   post:
   *     tags: [Vendor - Onboarding]
   *     summary: Save Step 4 - Account Preferences
   *     description: Saves selling categories, currency preferences, and creates vendor password
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               sellingCategories: { type: array, items: { type: string }, description: Array of category names }
   *               registerAs: { type: string, default: "Verified Supplier" }
   *               preferredCurrency: { type: string, example: "AED" }
   *               sponsorContent: { type: boolean }
   *               password: { type: string, minLength: 8, description: Must contain uppercase, lowercase, number, and special character }
   *               isDraft: { type: boolean, description: If true, saves as draft without validation }
   *     responses:
   *       200:
   *         description: Step 4 saved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 profile: { $ref: '#/components/schemas/UserProfile' }
   *                 nextStep: { type: integer }
   *       400:
   *         description: Validation error (password requirements, missing categories)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   */
  app.post("/api/vendor/onboarding/step4", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const {
        sellingCategories,
        registerAs,
        preferredCurrency,
        sponsorContent,
        password,
        isDraft,
      } = req.body;

      if (!isDraft) {
        if (!sellingCategories || sellingCategories.length === 0) {
          return res.status(400).json({ error: "Please select at least one selling category" });
        }

        if (!password) {
          return res.status(400).json({ error: "Password is required" });
        }

        if (password.length < 8) {
          return res.status(400).json({ error: "Password must be at least 8 characters" });
        }
      }

      const updateData: any = {
        sellingCategories,
        registerAs: registerAs || 'Verified Supplier',
        preferredCurrency,
        sponsorContent: sponsorContent || false,
        currentStep: 5,
        onboardingStatus: 'in_progress',
      };

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await storage.updateUserPassword(req.user.id, hashedPassword);
      }

      const profile = await storage.updateUserProfile(req.user.id, updateData);

      res.json({
        message: isDraft ? "Draft saved successfully" : "Step 4 saved successfully",
        profile,
        nextStep: 5,
      });
    } catch (error) {
      console.error("Error saving step 4:", error);
      res.status(500).json({ error: "Failed to save account preferences" });
    }
  });

  /**
   * @swagger
   * /vendor/onboarding/step5:
   *   post:
   *     tags: [Vendor - Onboarding]
   *     summary: Save Step 5 - Bank Details
   *     description: Saves payment method preferences and bank account information for vendor payouts
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               paymentMethod: { type: string, description: Selected payment method name }
   *               bankCountry: { type: string, description: ISO country code }
   *               financialInstitution: { type: string, description: Bank name }
   *               swiftCode: { type: string, description: Auto-filled from bank selection }
   *               bankAccountNumber: { type: string }
   *               proofType: { type: string, enum: ["Bank Statement", "Cancelled Cheque", "Bank Letter", "Account Confirmation Letter"] }
   *               bankProofUrl: { type: string }
   *               isDraft: { type: boolean, description: If true, saves as draft without validation }
   *     responses:
   *       200:
   *         description: Step 5 saved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 profile: { $ref: '#/components/schemas/UserProfile' }
   *                 nextStep: { type: string, example: "verification" }
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   */
  app.post("/api/vendor/onboarding/step5", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const {
        paymentMethod,
        bankCountry,
        financialInstitution,
        swiftCode,
        bankAccountNumber,
        proofType,
        bankProofUrl,
        isDraft,
      } = req.body;

      if (!isDraft) {
        if (!paymentMethod) {
          return res.status(400).json({ error: "Please select a payment method" });
        }

        if (!financialInstitution) {
          return res.status(400).json({ error: "Please select your bank" });
        }

        if (!bankAccountNumber) {
          return res.status(400).json({ error: "Bank account number is required" });
        }

        if (!proofType) {
          return res.status(400).json({ error: "Please select a proof type" });
        }

        if (!bankProofUrl) {
          return res.status(400).json({ error: "Bank proof document is required" });
        }
      }

      const profile = await storage.updateUserProfile(req.user.id, {
        paymentMethod,
        bankCountry,
        financialInstitution,
        swiftCode,
        bankAccountNumber,
        proofType,
        bankProofUrl,
        currentStep: 6,
        onboardingStatus: 'in_progress',
      });

      res.json({
        message: isDraft ? "Draft saved successfully" : "Step 5 saved successfully",
        profile,
        nextStep: 'verification',
      });
    } catch (error) {
      console.error("Error saving step 5:", error);
      res.status(500).json({ error: "Failed to save bank details" });
    }
  });

  /**
   * @swagger
   * /vendor/onboarding/submit-verification:
   *   post:
   *     tags: [Vendor - Onboarding]
   *     summary: Submit for Identity Verification
   *     description: Submits the vendor application for identity verification and sets status to pending_verification
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [verificationMethod]
   *             properties:
   *               verificationMethod: 
   *                 type: string
   *                 description: Selected verification method
   *                 example: "Over a Live Video Call"
   *     responses:
   *       200:
   *         description: Application submitted for verification
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message: { type: string }
   *                 profile: { $ref: '#/components/schemas/UserProfile' }
   *                 nextStep: { type: string, example: "dashboard" }
   *       400:
   *         description: Verification method not selected
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string }
   */
  app.post("/api/vendor/onboarding/submit-verification", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { verificationMethod } = req.body;

      if (!verificationMethod) {
        return res.status(400).json({ error: "Please select a verification method" });
      }

      const profile = await storage.updateUserProfile(req.user.id, {
        verificationMethod,
        submittedForApproval: true,
        submittedAt: new Date(),
        currentStep: null,
        onboardingStatus: 'pending_verification',
      });

      res.json({
        message: "Application submitted for verification",
        profile,
        nextStep: 'dashboard',
      });
    } catch (error) {
      console.error("Error submitting verification:", error);
      res.status(500).json({ error: "Failed to submit for verification" });
    }
  });

  // Reference Data APIs
  /**
   * @swagger
   * /reference/nature-of-business:
   *   get:
   *     tags: [Reference Data]
   *     summary: Get nature of business options
   */
  app.get("/api/reference/nature-of-business", async (req, res) => {
    try {
      const data = await storage.getReferenceData('nature_of_business');
      res.json(data.map(item => ({ id: item.id, name: item.name })));
    } catch (error) {
      console.error("Error fetching nature of business:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  /**
   * @swagger
   * /reference/type-of-buyer:
   *   get:
   *     tags: [Reference Data]
   *     summary: Get Type of Buyer options
   *     description: Returns the allowed values for the `type_of_buyer` enum used in user profiles.
   *     responses:
   *       200:
   *         description: Enum values
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: string
   */
  app.get("/api/reference/type-of-buyer", async (req, res) => {
    try {
      // Importing lazily to avoid circular import issues in some build setups
      const { TYPE_OF_BUYER_VALUES } = await import("@shared/schema");
      res.json(Array.from(TYPE_OF_BUYER_VALUES));
    } catch (error) {
      console.error("Error fetching type of buyer enum:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  /**
   * @swagger
   * /reference/end-use-markets:
   *   get:
   *     tags: [Reference Data]
   *     summary: Get end-use market options
   */
  app.get("/api/reference/end-use-markets", async (req, res) => {
    try {
      const data = await storage.getReferenceData('end_use_markets');
      res.json(data.map(item => ({ id: item.id, name: item.name })));
    } catch (error) {
      console.error("Error fetching end-use markets:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  /**
   * @swagger
   * /reference/license-types:
   *   get:
   *     tags: [Reference Data]
   *     summary: Get license type options
   */
  app.get("/api/reference/license-types", async (req, res) => {
    try {
      const data = await storage.getReferenceData('license_types');
      res.json(data.map(item => ({ id: item.id, name: item.name })));
    } catch (error) {
      console.error("Error fetching license types:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  /**
   * @swagger
   * /reference/countries:
   *   get:
   *     tags: [Reference Data]
   *     summary: Get countries list
   */
  app.get("/api/reference/countries", async (req, res) => {
    try {
      const data = await storage.getReferenceData('countries');
      res.json(data.map(item => ({ id: item.id, code: item.code, name: item.name, flag: item.flag })));
    } catch (error) {
      console.error("Error fetching countries:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  /**
   * @swagger
   * /reference/vendor-categories:
   *   get:
   *     tags: [Reference Data]
   *     summary: Get vendor categories for Step 4
   */
  app.get("/api/reference/vendor-categories", async (req, res) => {
    try {
      const data = await storage.getReferenceData('vendorCategories');
      res.json(data);
    } catch (error) {
      console.error("Error fetching vendor categories:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  /**
   * @swagger
   * /reference/currencies:
   *   get:
   *     tags: [Reference Data]
   *     summary: Get currencies list
   */
  app.get("/api/reference/currencies", async (req, res) => {
    try {
      const data = await storage.getReferenceData('currencies');
      res.json(data);
    } catch (error) {
      console.error("Error fetching currencies:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  /**
   * @swagger
   * /reference/payment-methods:
   *   get:
   *     tags: [Reference Data]
   *     summary: Get payment methods
   */
  app.get("/api/reference/payment-methods", async (req, res) => {
    try {
      const data = await storage.getReferenceData('paymentMethods');
      res.json(data);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  /**
   * @swagger
   * /reference/financial-institutions:
   *   get:
   *     tags: [Reference Data]
   *     summary: Get financial institutions (banks)
   */
  app.get("/api/reference/financial-institutions", async (req, res) => {
    try {
      const countryCode = req.query.country as string | undefined;
      const data = await storage.getReferenceData('financialInstitutions');
      const filtered = countryCode 
        ? data.filter((item: any) => item.countryCode === countryCode)
        : data;
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching financial institutions:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  /**
   * @swagger
   * /reference/proof-types:
   *   get:
   *     tags: [Reference Data]
   *     summary: Get proof types for bank verification
   */
  app.get("/api/reference/proof-types", async (req, res) => {
    try {
      const data = await storage.getReferenceData('proofTypes');
      res.json(data);
    } catch (error) {
      console.error("Error fetching proof types:", error);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  /**
   * @swagger
   * /reference/verification-methods:
   *   get:
   *     tags: [Reference Data]
   *     summary: Get identity verification methods
   */
  app.get("/api/reference/verification-methods", async (req, res) => {
    try {
      const data = await storage.getReferenceData('verificationMethods');
      res.json(data);
    } catch (error) {
      console.error("Error fetching verification methods:", error);
      res.status(500).json({ error: "Failed to fetch data" });
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
      console.log(products.length)
      const featured = products.filter((p: any) => p?.is_featured === true || p?.isFeatured === true);
      res.json(featured);
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
  *       - **Vendor Dashboard** (`/products`) - _Not yet implemented in frontend_
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

  /**
   * @swagger
   * /products/bulk/csv:
   *   post:
   *     tags: [Products]
   *     summary: Bulk create products via CSV upload
   *     description: |
   *       Upload a CSV file and create multiple products. Vendors can only create for themselves. Admins can set a single `vendorId` query param or leave it empty to create admin-owned products. If `vendorId` is null/omitted and caller is admin, products are admin-owned.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: vendorId
   *         schema: { type: string, nullable: true, format: uuid }
   *         description: Vendor UUID. Admin only. If omitted/null, products are admin-owned.
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [file]
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: CSV file with headers
   *     responses:
   *       201:
   *         description: Products created from CSV
   *       400:
   *         description: Validation or parsing error
   *       403:
   *         description: Requires vendor or admin access
   */
  // Lazy middleware that loads multer at runtime
  const csvUploadMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const multerMod: any = await import("multer");
      const upload = multerMod.default ? multerMod.default : multerMod;
      const mw = upload({ storage: upload.memoryStorage() }).single("file");
      mw(req, res, next);
    } catch (e) {
      next(e);
    }
  };

  app.post("/api/products/bulk/csv", csvUploadMiddleware as any, async (req, res) => {
    try {
      if (!isVendorOrAdmin(req.user)) {
        return res.status(403).json({ error: "Only vendors or admins can bulk create products" });
      }

      const file: any = (req as any).file;
      if (!file || !file.buffer) {
        return res.status(400).json({ error: "CSV file is required in 'file' field" });
      }

      // Determine final vendor ownership
      let finalVendorId: string | null | undefined = undefined;
      const vendorIdQuery = (req.query.vendorId as string | undefined) ?? undefined;

      if (req.user!.userType === 'vendor') {
        finalVendorId = req.user!.id;
      } else {
        if (vendorIdQuery === undefined || vendorIdQuery === null || vendorIdQuery === 'null' || vendorIdQuery === '') {
          finalVendorId = null; // admin-owned
        } else {
          const targetVendor = await storage.getUser(vendorIdQuery);
          if (!targetVendor || targetVendor.userType !== 'vendor') {
            return res.status(400).json({ error: "Provided vendorId is invalid or not a vendor" });
          }
          finalVendorId = vendorIdQuery;
        }
      }

      // Parse CSV
      const text = file.buffer.toString('utf8');
      const csvSync: any = await import("csv-parse/sync");
      const parseCsv = csvSync.parse || csvSync.default?.parse || csvSync.default;
      const records = parseCsv(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];

      if (!records.length) {
        return res.status(400).json({ error: "CSV contains no rows" });
      }

      // Helper coercers
      const toInt = (v?: string) => (v && v.trim() !== '' ? parseInt(v, 10) : undefined);
      const toFloatStr = (v?: string) => (v && v.trim() !== '' ? String(parseFloat(v)) : undefined);
      const toBool = (v?: string) => (v ? /^(true|1|yes)$/i.test(v) : undefined);
      const toStr = (v?: string) => (v && v.trim() !== '' ? v : undefined);
      const toArr = (v?: string) => (v && v.trim() !== '' ? v.split(/\s*[|,]\s*/).filter(Boolean) : undefined);

      // Map CSV rows to InsertProduct objects. Accepts common headers; extra columns are ignored.
      const mapped = records.map((r) => {
        const p: any = {
          name: toStr(r.name),
          sku: toStr(r.sku),
          description: toStr(r.description),
          image: toStr(r.image),
          gallery: toArr(r.gallery),
          price: toFloatStr(r.price),
          originalPrice: toFloatStr(r.originalPrice),
          currency: toStr(r.currency) || 'USD',
          stock: toInt(r.stock),
          status: toStr(r.status) as any,
          mainCategoryId: toInt(r.mainCategoryId as any),
          categoryId: toInt(r.categoryId as any),
          subCategoryId: toInt(r.subCategoryId as any),
          condition: toStr(r.condition) as any,
          vehicleCompatibility: toStr(r.vehicleCompatibility),
          certifications: toStr(r.certifications),
          countryOfOrigin: toStr(r.countryOfOrigin),
          controlledItemType: toStr(r.controlledItemType),
          dimensionLength: toFloatStr(r.dimensionLength),
          dimensionWidth: toFloatStr(r.dimensionWidth),
          dimensionHeight: toFloatStr(r.dimensionHeight),
          dimensionUnit: toStr(r.dimensionUnit),
          materials: toArr(r.materials),
          features: toArr(r.features),
          performance: toArr(r.performance),
          technicalDescription: toStr(r.technicalDescription),
          driveTypes: toArr(r.driveTypes),
          sizes: toArr(r.sizes),
          thickness: toArr(r.thickness),
          colors: toArr(r.colors),
          weightValue: toFloatStr(r.weightValue),
          weightUnit: toStr(r.weightUnit),
          packingLength: toFloatStr(r.packingLength),
          packingWidth: toFloatStr(r.packingWidth),
          packingHeight: toFloatStr(r.packingHeight),
          packingDimensionUnit: toStr(r.packingDimensionUnit),
          packingWeight: toFloatStr(r.packingWeight),
          packingWeightUnit: toStr(r.packingWeightUnit),
          minOrderQuantity: toInt(r.minOrderQuantity),
          basePrice: toFloatStr(r.basePrice),
          pricingTerms: toArr(r.pricingTerms),
          productionLeadTime: toInt(r.productionLeadTime),
          readyStockAvailable: toBool(r.readyStockAvailable),
          manufacturingSource: toStr(r.manufacturingSource),
          manufacturingSourceName: toStr(r.manufacturingSourceName),
          requiresExportLicense: toBool(r.requiresExportLicense),
          hasWarranty: toBool(r.hasWarranty),
          warrantyDuration: toInt(r.warrantyDuration),
          warrantyDurationUnit: toStr(r.warrantyDurationUnit),
          warrantyTerms: toStr(r.warrantyTerms),
          complianceConfirmed: toBool(r.complianceConfirmed),
          supplierSignature: toStr(r.supplierSignature),
          make: toStr(r.make),
          model: toStr(r.model),
          year: toInt(r.year),
          vehicleFitment: toStr(r.vehicleFitment),
          warranty: toStr(r.warranty),
          actionType: toStr(r.actionType) as any,
          isFeatured: toBool(r.isFeatured),
        };
        return p;
      });

      // Validate each with Zod and collect
      const valid: any[] = [];
      const errors: any[] = [];
      mapped.forEach((p, idx) => {
        try {
          const parsed = insertProductSchema.parse(p);
          valid.push({ ...parsed, vendorId: finalVendorId ?? null });
        } catch (e) {
          errors.push({ row: idx + 2, error: e instanceof z.ZodError ? e.errors : String(e) }); // +2 accounts for header row
        }
      });

      if (!valid.length) {
        return res.status(400).json({ error: "No valid rows found", details: errors });
      }

      const created = await storage.createProductsBulk(valid as any);
      res.status(201).json({ count: created.length, products: created, errors });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error bulk creating products via CSV:", error);
      res.status(500).json({ error: "Failed to bulk create products from CSV" });
    }
  });

  /**
   * @swagger
   * /products/bulk:
   *   post:
   *     tags: [Products]
   *     summary: Bulk create products (vendors and admins)
   *     description: |
   *       Create multiple products in a single request.
   *       - Vendors: products will be created under the authenticated vendor's account.
   *       - Admins: pass `vendorId` as a UUID to assign to a vendor, or `null` to create admin-owned products.
   *
   *       Note: If `vendorId` is null, it is treated as admin adding products.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [products]
   *             properties:
   *               vendorId:
   *                 type: string
   *                 nullable: true
   *                 description: "Vendor UUID. If null or omitted and caller is admin, products are admin-owned. Ignored for vendors."
   *               products:
   *                 type: array
   *                 minItems: 1
   *                 items:
   *                   $ref: '#/components/schemas/Product'
   *     responses:
   *       201:
   *         description: Products created
   *       400:
   *         description: Validation error
   *       403:
   *         description: Requires vendor or admin access
   */
  app.post("/api/products/bulk", async (req, res) => {
    try {
      if (!isVendorOrAdmin(req.user)) {
        return res.status(403).json({ error: "Only vendors or admins can bulk create products" });
      }

      const bulkSchema = z.object({
        vendorId: z.string().uuid().nullable().optional(),
        products: z.array(insertProductSchema).min(1),
      });

      const parsed = bulkSchema.parse(req.body);

      let finalVendorId: string | null | undefined = undefined;

      if (req.user!.userType === 'vendor') {
        finalVendorId = req.user!.id; // enforce self-ownership for vendors
      } else {
        // admin/super_admin
        finalVendorId = parsed.vendorId ?? null; // null means admin-owned

        if (finalVendorId) {
          const targetVendor = await storage.getUser(finalVendorId);
          if (!targetVendor || targetVendor.userType !== 'vendor') {
            return res.status(400).json({ error: "Provided vendorId is invalid or not a vendor" });
          }
        }
      }

      const toInsert = parsed.products.map((p: any) => ({
        ...p,
        vendorId: finalVendorId ?? null,
      }));

      const created = await storage.createProductsBulk(toInsert);
      res.status(201).json({ count: created.length, products: created });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error bulk creating products:", error);
      res.status(500).json({ error: "Failed to bulk create products" });
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

  /**
   * @swagger
  * /categories/main:
   *   get:
   *     tags: [Categories]
   *     summary: Get all main categories (level 0)
   *     description: Returns all categories with no parent (parentId is null)
  *     responses:
  *       200:
  *         description: List of main categories
  *         content:
  *           application/json:
  *             schema:
  *               type: array
  *               items:
  *                 $ref: '#/components/schemas/Category'
  *       500:
  *         description: Server error
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
   */
  app.get("/api/categories/main", async (req, res) => {
    try {
      const mainCategories = await storage.getCategoriesByLevel(0);
      res.json(mainCategories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch main categories" });
    }
  });

  /**
   * @swagger
  * /categories/by-parent/{parentId}:
   *   get:
   *     tags: [Categories]
   *     summary: Get subcategories by parent ID
   *     description: Returns all categories that have the specified parent ID
   *     parameters:
   *       - in: path
   *         name: parentId
   *         required: true
   *         schema: { type: integer }
  *     responses:
  *       200:
  *         description: List of subcategories
  *         content:
  *           application/json:
  *             schema:
  *               type: array
  *               items:
  *                 $ref: '#/components/schemas/Category'
  *       400:
  *         description: Invalid parent id
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       500:
  *         description: Server error
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
   */
  app.get("/api/categories/by-parent/:parentId", async (req, res) => {
    try {
      const parentId = parseInt(req.params.parentId);
      if (isNaN(parentId)) {
        return res.status(400).json({ error: "Invalid parent ID" });
      }
      const subcategories = await storage.getCategoriesByParentId(parentId);
      res.json(subcategories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subcategories" });
    }
  });

  /**
   * @swagger
  * /categories/search:
   *   get:
   *     tags: [Categories]
   *     summary: Search categories by name
   *     description: Search for categories by name with optional parent ID filter
   *     parameters:
   *       - in: query
   *         name: name
   *         required: true
   *         schema: { type: string }
   *       - in: query
   *         name: parentId
   *         required: false
   *         schema: { type: integer }
  *     responses:
  *       200:
  *         description: List of matching categories
  *         content:
  *           application/json:
  *             schema:
  *               type: array
  *               items:
  *                 $ref: '#/components/schemas/Category'
  *       400:
  *         description: Missing or invalid query
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       500:
  *         description: Server error
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
   */
  app.get("/api/categories/search", async (req, res) => {
    try {
      const { name, parentId } = req.query;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: "Name query parameter is required" });
      }
      
      const parentIdNum = parentId ? parseInt(parentId as string) : undefined;
      if (parentId && isNaN(parentIdNum!)) {
        return res.status(400).json({ error: "Invalid parent ID" });
      }
      
      const categories = await storage.searchCategoriesByName(name, parentIdNum);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to search categories" });
    }
  });

  /**
   * @swagger
  * /categories/{id}:
   *   get:
   *     tags: [Categories]
   *     summary: Get category by ID
   *     description: Returns a single category with its parent and children
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
  *     responses:
  *       200:
  *         description: Category details
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Category'
  *       404:
  *         description: Category not found
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       400:
  *         description: Invalid category id
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
   */
  app.get("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid category ID" });
      }
      
      const category = await storage.getCategoryById(id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch category" });
    }
  });

  /**
   * @swagger
  * /categories/{id}/hierarchy:
   *   get:
   *     tags: [Categories]
   *     summary: Get category hierarchy path
   *     description: Returns the full path from main category to the specified category
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
  *     responses:
  *       200:
  *         description: Category hierarchy path
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/CategoryHierarchy'
  *       400:
  *         description: Invalid category id
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       500:
  *         description: Server error
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
   */
  app.get("/api/categories/:id/hierarchy", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid category ID" });
      }
      
      const hierarchy = await storage.getCategoryHierarchy(id);
      res.json(hierarchy);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch category hierarchy" });
    }
  });

  /**
   * @swagger
  * /categories:
   *   post:
   *     tags: [Categories]
   *     summary: Create a new category
   *     description: |
   *       Create a new category. Supports up to 2 levels of nesting:
   *       - Level 0: Main category (parentId is null)
   *       - Level 1: Category (parentId references main category)
   *       - Level 2: Subcategory (parentId references category)
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             $ref: '#/components/schemas/CategoryInput'
  *     responses:
  *       201:
  *         description: Category created successfully
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Category'
  *       400:
  *         description: Invalid input or max nesting level exceeded
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       401:
  *         description: Authentication required
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       403:
  *         description: Forbidden - admin only
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       500:
  *         description: Server error
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
   */
  app.post("/api/categories", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Check if user is admin
      if (req.user.userType !== 'admin' && req.user.userType !== 'super_admin') {
        return res.status(403).json({ error: "Only admins can create categories" });
      }

      const { name, image, description, parentId } = req.body;

      if (!name || !image) {
        return res.status(400).json({ error: "Name and image are required" });
      }

      // Validate nesting level (max 2 levels deep)
      if (parentId) {
        const level = await storage.getCategoryLevel(parentId);
        if (level >= 2) {
          return res.status(400).json({ 
            error: "Maximum nesting level reached. Categories can only go 2 levels deep (main category > category > subcategory)" 
          });
        }
      }

      const category = await storage.createCategory({
        name,
        image,
        description: description || null,
        parentId: parentId || null,
      });

      res.status(201).json(category);
    } catch (error) {
      console.error("Create category error:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  /**
   * @swagger
  * /categories/{id}:
   *   put:
   *     tags: [Categories]
   *     summary: Update a category
   *     description: Update category details. Cannot change parentId if it would exceed max nesting level
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
  *             $ref: '#/components/schemas/CategoryInput'
  *     responses:
  *       200:
  *         description: Category updated successfully
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Category'
  *       400:
  *         description: Bad request / validation error
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       401:
  *         description: Authentication required
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       403:
  *         description: Forbidden - admin only
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       404:
  *         description: Category not found
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       500:
  *         description: Server error
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
   */
  app.put("/api/categories/:id", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Check if user is admin
      if (req.user.userType !== 'admin' && req.user.userType !== 'super_admin') {
        return res.status(403).json({ error: "Only admins can update categories" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid category ID" });
      }

      const { name, image, description, parentId } = req.body;

      // Check if category exists
      const existing = await storage.getCategoryById(id);
      if (!existing) {
        return res.status(404).json({ error: "Category not found" });
      }

      // Validate nesting level if parentId is being changed
      if (parentId !== undefined && parentId !== existing.parentId) {
        if (parentId !== null) {
          const level = await storage.getCategoryLevel(parentId);
          if (level >= 2) {
            return res.status(400).json({ 
              error: "Maximum nesting level reached. Categories can only go 2 levels deep" 
            });
          }
        }

        // Check if this category has children - if so, verify the new structure won't exceed limits
        const children = await storage.getCategoriesByParentId(id);
        if (children.length > 0 && parentId !== null) {
          const newParentLevel = await storage.getCategoryLevel(parentId);
          if (newParentLevel >= 1) {
            return res.status(400).json({ 
              error: "Cannot move this category - it has subcategories and moving would exceed nesting limit" 
            });
          }
        }
      }

      const updated = await storage.updateCategory(id, {
        name: name !== undefined ? name : existing.name,
        image: image !== undefined ? image : existing.image,
        description: description !== undefined ? description : existing.description,
        parentId: parentId !== undefined ? parentId : existing.parentId,
      });

      res.json(updated);
    } catch (error) {
      console.error("Update category error:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  /**
   * @swagger
  * /categories/{id}:
   *   delete:
   *     tags: [Categories]
   *     summary: Delete a category
   *     description: Delete a category. Cannot delete if it has subcategories or products
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
  *     responses:
  *       200:
  *         description: Category deleted successfully
  *         content:
  *           application/json:
  *             schema:
  *               type: object
  *               properties:
  *                 message: { type: string }
  *       400:
  *         description: Cannot delete - has subcategories or products
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       401:
  *         description: Authentication required
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       403:
  *         description: Forbidden - admin only
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       404:
  *         description: Category not found
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
  *       500:
  *         description: Server error
  *         content:
  *           application/json:
  *             schema:
  *               $ref: '#/components/schemas/Error'
   */
  app.delete("/api/categories/:id", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Check if user is admin
      if (req.user.userType !== 'admin' && req.user.userType !== 'super_admin') {
        return res.status(403).json({ error: "Only admins can delete categories" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid category ID" });
      }

      // Check if category exists
      const existing = await storage.getCategoryById(id);
      if (!existing) {
        return res.status(404).json({ error: "Category not found" });
      }

      // Check if category has children
      const children = await storage.getCategoriesByParentId(id);
      if (children.length > 0) {
        return res.status(400).json({ 
          error: "Cannot delete category - it has subcategories. Delete subcategories first." 
        });
      }

      // Check if category has products
      const hasProducts = await storage.categoryHasProducts(id);
      if (hasProducts) {
        return res.status(400).json({ 
          error: "Cannot delete category - it has associated products. Move or delete products first." 
        });
      }

      await storage.deleteCategory(id);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Delete category error:", error);
      res.status(500).json({ error: "Failed to delete category" });
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

      // Calculate order total with shipping and tax
      const subtotal = cartItems.reduce((sum, item) => 
        sum + (parseFloat(item.product.price || '0') * item.quantity), 0);
      
      const shipping = subtotal > 500 ? 0 : 40;
      const tax = subtotal * 0.05;
      const total = subtotal + shipping + tax;

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
        const { getStripeClient } = await import("./stripeClient");
        const stripe = await getStripeClient();

        // Build line items from cart
        const lineItems: any[] = cartItems.map(item => ({
          price_data: {
            currency: 'aed',
            product_data: {
              name: item.product.name,
              images: item.product.gallery && item.product.gallery.length > 0 
                ? item.product.gallery 
                : [item.product.image],
              metadata: {
                productId: item.product.id.toString(),
                sku: item.product.sku || 'N/A',
              },
            },
            unit_amount: Math.round(parseFloat(item.product.price || '0') * 100),
          },
          quantity: item.quantity,
        }));

        // Add shipping line item if applicable
        if (shipping > 0) {
          lineItems.push({
            price_data: {
              currency: 'aed',
              product_data: {
                name: 'Shipping',
                description: 'Standard Shipping (3-5 business days)',
              },
              unit_amount: Math.round(shipping * 100),
            },
            quantity: 1,
          });
        }

        // Add tax line item
        lineItems.push({
          price_data: {
            currency: 'aed',
            product_data: {
              name: 'VAT (5%)',
              description: 'Value Added Tax',
            },
            unit_amount: Math.round(tax * 100),
          },
          quantity: 1,
        });

        // Determine base URL for redirects
        const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
        const baseUrl = replitDomain 
          ? `https://${replitDomain}` 
          : process.env.APP_URL || (req.headers.origin || `${req.protocol}://${req.get('host')}`);

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: lineItems,
          mode: 'payment',
          success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
          cancel_url: `${baseUrl}/cart?cancelled=true`,
          customer_email: req.user.email,
          client_reference_id: order.id,
          metadata: {
            userId: req.user.id,
            orderId: order.id,
          },
          // Add billing and shipping address fields
          billing_address_collection: 'required',
          shipping_address_collection: {
            allowed_countries: ['AE', 'SA', 'OM', 'KW', 'QA', 'BH', 'US', 'GB', 'CA', 'AU'],
          },
        });

        // Log successful session creation
        console.log(`Stripe session created: ${session.id} for order ${order.id}`);

        res.json({ 
          url: session.url, 
          orderId: order.id,
          sessionId: session.id 
        });
      } catch (stripeError: any) {
        console.log("Stripe error or not configured:", stripeError.message);
        
        // Check if it's a configuration error vs other error
        if (stripeError.message?.includes('credentials') || 
            stripeError.message?.includes('not found') ||
            stripeError.message?.includes('STRIPE')) {
          // Stripe not configured - return test mode response with order info
          console.log("Stripe credentials not available - using test mode");
          res.json({ 
            testMode: true,
            orderId: order.id,
            message: "Order created successfully. To process payments, configure Stripe credentials.",
            tip: "Set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY environment variables or configure Stripe in Replit Connectors."
          });
        } else {
          // Real Stripe API error
          throw stripeError;
        }
      }
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  /**
   * @swagger
   * /checkout/webhook:
   *   post:
   *     tags: [Checkout]
   *     summary: Stripe webhook handler
   *     description: |
   *       Handles Stripe webhook events for payment processing.
   *       Updates order status when payment is completed or fails.
   *     responses:
   *       200:
   *         description: Webhook processed successfully
   *       400:
   *         description: Invalid webhook signature
   */
  app.post("/api/checkout/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    try {
      const { getStripeClient, getStripeSecretKey } = await import("./stripeClient");
      const stripe = await getStripeClient();
      const secretKey = await getStripeSecretKey();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.warn("STRIPE_WEBHOOK_SECRET not configured - webhook signature validation skipped");
        // Continue processing without signature validation in development
      } else {
        // Verify webhook signature
        const event = stripe.webhooks.constructEvent(
          (req.rawBody as string | Buffer) || JSON.stringify(req.body),
          sig as string,
          webhookSecret
        );

        // Handle different event types
        switch (event.type) {
          case 'checkout.session.completed':
            const session = event.data.object as any;
            
            // Update order status to processing
            const orderId = session.metadata?.orderId || session.client_reference_id;
            if (orderId) {
              await storage.updateOrderStatus(orderId, 'processing', 'stripe_webhook', 'Payment confirmed via Stripe');
              console.log(`Order ${orderId} payment completed`);
            }
            break;

          case 'payment_intent.payment_failed':
            const failedIntent = event.data.object as any;
            
            // Update order status to cancelled
            if (failedIntent.metadata?.orderId) {
              await storage.updateOrderStatus(failedIntent.metadata.orderId, 'cancelled', 'stripe_webhook', 'Payment failed');
              console.log(`Order ${failedIntent.metadata.orderId} payment failed`);
            }
            break;

          case 'charge.refunded':
            const refundedCharge = event.data.object as any;
            
            // Handle refund
            if (refundedCharge.metadata?.orderId) {
              console.log(`Order ${refundedCharge.metadata.orderId} has been refunded`);
            }
            break;

          default:
            console.log(`Unhandled event type: ${event.type}`);
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: `Webhook Error: ${error.message}` });
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

  // ===== ADDRESSES =====

  /**
   * @swagger
   * /addresses:
   *   get:
   *     tags: [Addresses]
   *     summary: Get user addresses
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of user addresses
   */
  app.get("/api/addresses", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const userAddresses = await storage.getAddressesByUserId(req.user.id);
      res.json(userAddresses);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      res.status(500).json({ error: "Failed to fetch addresses" });
    }
  });

  /**
   * @swagger
   * /addresses:
   *   post:
   *     tags: [Addresses]
   *     summary: Create new address
   *     security:
   *       - bearerAuth: []
   */
  app.post("/api/addresses", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const address = await storage.createAddress({
        ...req.body,
        userId: req.user.id
      });
      res.status(201).json(address);
    } catch (error) {
      console.error("Error creating address:", error);
      res.status(500).json({ error: "Failed to create address" });
    }
  });

  /**
   * @swagger
   * /addresses/{id}:
   *   put:
   *     tags: [Addresses]
   *     summary: Update address
   *     security:
   *       - bearerAuth: []
   */
  app.put("/api/addresses/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getAddressById(id);
      if (!existing || existing.userId !== req.user.id) {
        return res.status(404).json({ error: "Address not found" });
      }
      const updated = await storage.updateAddress(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating address:", error);
      res.status(500).json({ error: "Failed to update address" });
    }
  });

  /**
   * @swagger
   * /addresses/{id}:
   *   delete:
   *     tags: [Addresses]
   *     summary: Delete address
   *     security:
   *       - bearerAuth: []
   */
  app.delete("/api/addresses/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getAddressById(id);
      if (!existing || existing.userId !== req.user.id) {
        return res.status(404).json({ error: "Address not found" });
      }
      await storage.deleteAddress(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting address:", error);
      res.status(500).json({ error: "Failed to delete address" });
    }
  });

  /**
   * @swagger
   * /addresses/{id}/default:
   *   post:
   *     tags: [Addresses]
   *     summary: Set default address
   *     security:
   *       - bearerAuth: []
   */
  app.post("/api/addresses/:id/default", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getAddressById(id);
      if (!existing || existing.userId !== req.user.id) {
        return res.status(404).json({ error: "Address not found" });
      }
      await storage.setDefaultAddress(req.user.id, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting default address:", error);
      res.status(500).json({ error: "Failed to set default address" });
    }
  });

  // ===== SAVED PAYMENT METHODS =====

  /**
   * @swagger
   * /payments:
   *   get:
   *     tags: [Payments]
   *     summary: Get saved payment methods
   *     description: Returns tokenized payment methods (PCI-DSS compliant - no raw card data)
   *     security:
   *       - bearerAuth: []
   */
  app.get("/api/payments", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const payments = await storage.getSavedPaymentsByUserId(req.user.id);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });

  /**
   * @swagger
   * /payments:
   *   post:
   *     tags: [Payments]
   *     summary: Save a payment method (from Stripe token)
   *     description: |
   *       Stores tokenized payment method reference. 
   *       Compliant with PCI-DSS, RBI (India), and UAE Central Bank regulations.
   *       Only stores last 4 digits, card brand, and processor token.
   *     security:
   *       - bearerAuth: []
   */
  app.post("/api/payments", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      // Validate required fields for regulatory compliance
      const { country, processorToken, paymentMethodType } = req.body;
      if (!country || !processorToken || !paymentMethodType) {
        return res.status(400).json({ error: "Missing required fields: country, processorToken, paymentMethodType" });
      }
      
      // For India (RBI regulations), require explicit consent
      if (country === 'IN' && !req.body.hasRbiConsent) {
        return res.status(400).json({ 
          error: "RBI regulations require explicit consent for card-on-file storage in India",
          requiresConsent: true
        });
      }
      
      const payment = await storage.createSavedPayment({
        ...req.body,
        userId: req.user.id,
        consentTimestamp: req.body.hasRbiConsent ? new Date() : null
      });
      res.status(201).json(payment);
    } catch (error) {
      console.error("Error creating payment method:", error);
      res.status(500).json({ error: "Failed to save payment method" });
    }
  });

  /**
   * @swagger
   * /payments/{id}:
   *   delete:
   *     tags: [Payments]
   *     summary: Delete saved payment method
   *     description: Soft deletes the payment method (regulatory compliance requires record keeping)
   *     security:
   *       - bearerAuth: []
   */
  app.delete("/api/payments/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getSavedPaymentById(id);
      if (!existing || existing.userId !== req.user.id) {
        return res.status(404).json({ error: "Payment method not found" });
      }
      await storage.deleteSavedPayment(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting payment method:", error);
      res.status(500).json({ error: "Failed to delete payment method" });
    }
  });

  /**
   * @swagger
   * /payments/{id}/default:
   *   post:
   *     tags: [Payments]
   *     summary: Set default payment method
   *     security:
   *       - bearerAuth: []
   */
  app.post("/api/payments/:id/default", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getSavedPaymentById(id);
      if (!existing || existing.userId !== req.user.id) {
        return res.status(404).json({ error: "Payment method not found" });
      }
      await storage.setDefaultPayment(req.user.id, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting default payment:", error);
      res.status(500).json({ error: "Failed to set default payment method" });
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
    *       Admins and super admins can also use this endpoint
    *       to view any vendor's products.
    *       
    *       ## Pages / Sections Used
    *       - **Vendor Dashboard** (`/products`) - _Not yet implemented in frontend_
    *         - Products Table - manage listings, inventory, pricing
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of vendor's products
  *       403:
  *         description: Authentication required (vendor, admin or super_admin)
   */
  app.get("/api/vendor/products", async (req, res) => {
    try {
      if (!isVendorOrAdmin(req.user)) {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const products = await storage.getProducts({ vendorId: req.user!.id });
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vendor products" });
    }
  });

  // Create a new product (vendor)
  app.post("/api/vendor/products", async (req, res) => {
    try {
      if (!isVendorOrAdmin(req.user)) {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const productData = {
        ...req.body,
        vendorId: req.user!.id,
      };
      
      const validated = insertProductSchema.parse(productData);
      const product = await storage.createProduct(validated);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid product data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  // Update a product (vendor)
  app.put("/api/vendor/products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const existing = await storage.getProductById(productId);
      
      if (!existing) {
        return res.status(404).json({ error: "Product not found" });
      }

      if (!isVendorOrAdmin(req.user)) {
        return res.status(403).json({ error: "Vendor access required" });
      }

      if (existing.vendorId !== req.user!.id && req.user!.userType === 'vendor') {
        return res.status(403).json({ error: "Not authorized to edit this product" });
      }

      const product = await storage.updateProduct(productId, req.body);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  // Delete a product (vendor)
  app.delete("/api/vendor/products/:id", async (req, res) => {
    try {
      if (!isVendorOrAdmin(req.user)) {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const productId = parseInt(req.params.id);
      const product = await storage.getProductById(productId);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      if (product.vendorId !== req.user!.id && req.user!.userType === 'vendor') {
        return res.status(403).json({ error: "Not authorized to delete this product" });
      }

      const deleted = await storage.deleteProduct(productId, product.vendorId!);

      if (!deleted) {
        return res.status(404).json({ error: "Product not found or not authorized" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Get vendor orders
  app.get("/api/vendor/orders", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== 'vendor') {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const orders = await storage.getVendorOrders(req.user.id);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching vendor orders:", error);
      res.status(500).json({ error: "Failed to fetch vendor orders" });
    }
  });

  // Update order status (vendor)
  app.patch("/api/vendor/orders/:id/status", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== 'vendor') {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const { status, note } = req.body;
      const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
      
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const order = await storage.updateOrderStatus(req.params.id, status, req.user.id, note);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // Get order status history
  app.get("/api/vendor/orders/:id/history", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== 'vendor') {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const history = await storage.getOrderStatusHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching order history:", error);
      res.status(500).json({ error: "Failed to fetch order history" });
    }
  });

  // Get vendor customers
  app.get("/api/vendor/customers", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== 'vendor') {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const customers = await storage.getVendorCustomers(req.user.id);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching vendor customers:", error);
      res.status(500).json({ error: "Failed to fetch vendor customers" });
    }
  });

  // Get vendor analytics
  app.get("/api/vendor/analytics", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== 'vendor') {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const analytics = await storage.getVendorAnalytics(req.user.id);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching vendor analytics:", error);
      res.status(500).json({ error: "Failed to fetch vendor analytics" });
    }
  });

  // ===== VENDOR PANEL EXTENDED APIs =====

  /**
   * @swagger
   * /vendor/financials:
   *   get:
   *     tags: [Vendor Panel]
   *     summary: Get vendor financial summary
   *     description: Returns earnings, commissions, and payout information
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Financial summary
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 totalEarnings: { type: number }
   *                 totalCommission: { type: number }
   *                 netEarnings: { type: number }
   *                 pendingPayouts: { type: number }
   *                 completedPayouts: { type: number }
   *                 currentMonthEarnings: { type: number }
   *                 lastMonthEarnings: { type: number }
   *                 orderCount: { type: integer }
   *                 averageOrderValue: { type: number }
   */
  app.get("/api/vendor/financials", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== 'vendor') {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const financials = await storage.getVendorFinancials(req.user.id);
      res.json(financials);
    } catch (error) {
      console.error("Error fetching vendor financials:", error);
      res.status(500).json({ error: "Failed to fetch financial data" });
    }
  });

  /**
   * @swagger
   * /vendor/financials/monthly:
   *   get:
   *     tags: [Vendor Panel]
   *     summary: Get monthly earnings breakdown
   *     description: Returns earnings, commission, and net by month
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: months
   *         schema: { type: integer, default: 12 }
   *         description: Number of months to return
   *     responses:
   *       200:
   *         description: Monthly earnings data
   */
  app.get("/api/vendor/financials/monthly", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== 'vendor') {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const months = req.query.months ? parseInt(req.query.months as string) : 12;
      const data = await storage.getVendorEarningsByMonth(req.user.id, months);
      res.json(data);
    } catch (error) {
      console.error("Error fetching monthly earnings:", error);
      res.status(500).json({ error: "Failed to fetch monthly earnings" });
    }
  });

  /**
   * @swagger
   * /vendor/commission:
   *   get:
   *     tags: [Vendor Panel]
   *     summary: Get vendor's commission rate
   *     description: Returns the vendor's current commission percentage
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Commission info
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 percent: { type: string }
   *                 isCustom: { type: boolean }
   */
  app.get("/api/vendor/commission", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== 'vendor') {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const commission = await storage.getVendorCommission(req.user.id);
      res.json(commission);
    } catch (error) {
      console.error("Error fetching commission:", error);
      res.status(500).json({ error: "Failed to fetch commission" });
    }
  });

  /**
   * @swagger
   * /vendor/refunds:
   *   get:
   *     tags: [Vendor Panel]
   *     summary: Get refund requests for vendor's products
   *     description: Returns refund requests that involve the vendor's products
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [pending, under_review, approved, rejected, processing, completed, failed] }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *     responses:
   *       200:
   *         description: List of refund requests
   */
  app.get("/api/vendor/refunds", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== 'vendor') {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const { status, page, limit } = req.query;
      const result = await storage.getVendorRefunds(req.user.id, {
        status: status as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching vendor refunds:", error);
      res.status(500).json({ error: "Failed to fetch refunds" });
    }
  });

  /**
   * @swagger
   * /vendor/inventory/bulk:
   *   put:
   *     tags: [Vendor Panel]
   *     summary: Bulk update product inventory
   *     description: Updates stock levels for multiple products at once
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [updates]
   *             properties:
   *               updates:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     productId: { type: integer }
   *                     stock: { type: integer }
   *     responses:
   *       200:
   *         description: Update result
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 updated: { type: integer }
   *                 failed: { type: integer }
   */
  app.put("/api/vendor/inventory/bulk", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== 'vendor') {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const { updates } = req.body;
      
      if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({ error: "Updates array is required" });
      }
      
      const result = await storage.updateVendorStock(req.user.id, updates);
      res.json(result);
    } catch (error) {
      console.error("Error updating inventory:", error);
      res.status(500).json({ error: "Failed to update inventory" });
    }
  });

  /**
   * @swagger
   * /vendor/onboarding/status:
   *   get:
   *     tags: [Vendor Panel]
   *     summary: Get vendor onboarding status
   *     description: Returns the vendor's current onboarding status and review information
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Onboarding status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status: { type: string }
   *                 currentStep: { type: integer }
   *                 submittedAt: { type: string, format: date-time }
   *                 reviewedAt: { type: string, format: date-time }
   *                 rejectionReason: { type: string }
   *                 reviewNote: { type: string }
   */
  app.get("/api/vendor/onboarding/status", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== 'vendor') {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const profile = await storage.getUserProfile(req.user.id);
      
      if (!profile) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }
      
      res.json({
        status: profile.onboardingStatus,
        currentStep: profile.currentStep,
        submittedAt: profile.submittedAt,
        reviewedAt: profile.reviewedAt,
        rejectionReason: profile.rejectionReason,
        reviewNote: profile.reviewNote,
      });
    } catch (error) {
      console.error("Error fetching onboarding status:", error);
      res.status(500).json({ error: "Failed to fetch status" });
    }
  });

  // ===== VENDOR NOTIFICATIONS APIs =====

  /**
   * @swagger
   * /vendor/notifications:
   *   get:
   *     tags: [Vendor Panel]
   *     summary: Get vendor notifications
   *     description: Returns paginated notifications for the authenticated vendor
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: type
   *         schema: { type: string, enum: [order_new, order_status, refund_request, payout, approval, product_review] }
   *       - in: query
   *         name: unreadOnly
   *         schema: { type: boolean, default: false }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200:
   *         description: Notifications list
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 notifications: { type: array }
   *                 total: { type: integer }
   *                 unreadCount: { type: integer }
   */
  app.get("/api/vendor/notifications", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== 'vendor') {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const { type, unreadOnly, page, limit } = req.query;
      const result = await storage.getVendorNotifications(req.user.id, {
        type: type as string,
        unreadOnly: unreadOnly === 'true',
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  /**
   * @swagger
   * /vendor/notifications/{notificationId}/read:
   *   post:
   *     tags: [Vendor Panel]
   *     summary: Mark notification as read
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: notificationId
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: Notification marked as read
   */
  app.post("/api/vendor/notifications/:notificationId/read", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== 'vendor') {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const notificationId = parseInt(req.params.notificationId);
      const notification = await storage.markNotificationRead(req.user.id, notificationId);
      
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }
      
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  /**
   * @swagger
   * /vendor/notifications/read-all:
   *   post:
   *     tags: [Vendor Panel]
   *     summary: Mark all notifications as read
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: All notifications marked as read
   */
  app.post("/api/vendor/notifications/read-all", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== 'vendor') {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const count = await storage.markAllNotificationsRead(req.user.id);
      res.json({ marked: count });
    } catch (error) {
      console.error("Error marking notifications read:", error);
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  });

  /**
   * @swagger
   * /vendor/notifications/{notificationId}:
   *   delete:
   *     tags: [Vendor Panel]
   *     summary: Delete a notification
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: notificationId
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: Notification deleted
   */
  app.delete("/api/vendor/notifications/:notificationId", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== 'vendor') {
        return res.status(403).json({ error: "Vendor access required" });
      }

      const notificationId = parseInt(req.params.notificationId);
      const deleted = await storage.deleteNotification(req.user.id, notificationId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Notification not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // ===== ADMIN PANEL APIs =====

  // Admin middleware helper
  function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (req.user.userType !== 'admin' && req.user.userType !== 'super_admin') {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  }

  /**
   * @swagger
   * /admin/dashboard:
   *   get:
   *     tags: [Admin]
   *     summary: Get admin dashboard statistics
   *     description: Returns platform-wide statistics for the admin dashboard
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Dashboard statistics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 totalSellers: { type: integer }
   *                 activeSellers: { type: integer }
   *                 pendingApprovals: { type: integer }
   *                 totalProducts: { type: integer }
   *                 totalOrders: { type: integer }
   *                 totalRevenue: { type: number }
   *                 totalCustomers: { type: integer }
   *                 totalRefunds: { type: integer }
   */
  app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });

  /**
   * @swagger
   * /admin/sellers:
   *   get:
   *     tags: [Admin - Sellers]
   *     summary: Get all sellers with filters and pagination
   *     description: Returns a paginated list of sellers with their profiles and stats
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, in_progress, pending_verification, under_review, approved, rejected]
   *         description: Filter by onboarding status
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search by name, email, or username
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *     responses:
   *       200:
   *         description: Paginated list of sellers
   */
  app.get("/api/admin/sellers", requireAdmin, async (req, res) => {
    try {
      const { status, search, page, limit, sortOrder } = req.query;
      
      const result = await storage.getAllSellers({
        status: status as string,
        search: search as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching sellers:", error);
      res.status(500).json({ error: "Failed to fetch sellers" });
    }
  });

  /**
   * @swagger
   * /admin/vendors:
   *   get:
   *     tags: [Admin - Vendors]
   *     summary: Get all vendors with filters and pagination
   *     description: Returns a paginated list of vendors with their profiles and stats
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, in_progress, pending_verification, under_review, approved, rejected]
   *         description: Filter by onboarding status
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search by name, email, or username
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *     responses:
   *       200:
   *         description: Paginated list of vendors
   */
  app.get("/api/admin/vendors", requireAdmin, async (req, res) => {
    try {
      const { status, search, page, limit, sortOrder } = req.query;
      const result = await storage.getAllSellers({
        status: status as string,
        search: search as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  /**
   * @swagger
   * /admin/sellers/{id}:
   *   get:
   *     tags: [Admin - Sellers]
   *     summary: Get seller details
   *     description: Returns detailed information about a specific seller
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
   *         description: Seller details with profile, stats, and recent orders
   *       404:
   *         description: Seller not found
   */
  app.get("/api/admin/sellers/:id", requireAdmin, async (req, res) => {
    try {
      const seller = await storage.getSellerDetails(req.params.id);
      
      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }
      
      res.json(seller);
    } catch (error) {
      console.error("Error fetching seller details:", error);
      res.status(500).json({ error: "Failed to fetch seller details" });
    }
  });

  /**
   * @swagger
   * /admin/vendors/{id}:
   *   get:
   *     tags: [Admin - Vendors]
   *     summary: Get vendor details
   *     description: Returns detailed information about a specific vendor
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
   *         description: Vendor details with profile, stats, and recent orders
   *       404:
   *         description: Vendor not found
   */
  app.get("/api/admin/vendors/:id", requireAdmin, async (req, res) => {
    try {
      const vendor = await storage.getSellerDetails(req.params.id);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("Error fetching vendor details:", error);
      res.status(500).json({ error: "Failed to fetch vendor details" });
    }
  });

  /**
   * @swagger
   * /admin/sellers/{id}/status:
   *   patch:
   *     tags: [Admin - Sellers]
   *     summary: Update seller status
   *     description: Approve, reject, or update seller onboarding status
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [status]
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [approved, rejected, pending_verification, under_review]
   *               note:
   *                 type: string
   *               rejectionReason:
   *                 type: string
   *     responses:
   *       200:
   *         description: Updated vendor profile
   */
  app.patch("/api/admin/sellers/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status, note, rejectionReason } = req.body;
      const validStatuses = ['approved', 'rejected', 'pending_verification', 'under_review'];
      
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be one of: " + validStatuses.join(', ') });
      }
      
      if (status === 'rejected' && !rejectionReason) {
        return res.status(400).json({ error: "Rejection reason is required when rejecting a seller" });
      }
      
      // Get seller before update for logging
      const sellerBefore = await storage.getSellerDetails(req.params.id);
      if (!sellerBefore) {
        return res.status(404).json({ error: "Seller not found" });
      }
      
      const updated = await storage.updateSellerStatus(
        req.params.id,
        status,
        req.user!.id,
        note,
        rejectionReason
      );
      
      if (!updated) {
        return res.status(404).json({ error: "Seller profile not found" });
      }
      
      // Log admin action
      const actionType = status === 'approved' ? 'seller_approved' : 
                        status === 'rejected' ? 'seller_rejected' : 'settings_changed';
      
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: actionType as any,
        targetType: 'user',
        targetId: req.params.id,
        previousValue: JSON.stringify({ status: sellerBefore.userProfile?.onboardingStatus }),
        newValue: JSON.stringify({ status, note, rejectionReason }),
        ipAddress: getClientIp(req),
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating seller status:", error);
      res.status(500).json({ error: "Failed to update seller status" });
    }
  });

  /**
   * @swagger
   * /admin/vendors/{id}/status:
   *   patch:
   *     tags: [Admin - Vendors]
   *     summary: Update vendor status
   *     description: Approve, reject, or update vendor onboarding status
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [status]
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [approved, rejected, pending_verification, under_review]
   *               note:
   *                 type: string
   *               rejectionReason:
   *                 type: string
   *     responses:
   *       200:
   *         description: Updated vendor profile
   */
  app.patch("/api/admin/vendors/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status, note, rejectionReason } = req.body;
      const validStatuses = ['approved', 'rejected', 'pending_verification', 'under_review'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be one of: " + validStatuses.join(', ') });
      }
      if (status === 'rejected' && !rejectionReason) {
        return res.status(400).json({ error: "Rejection reason is required when rejecting a vendor" });
      }
      const vendorBefore = await storage.getSellerDetails(req.params.id);
      if (!vendorBefore) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      const updated = await storage.updateSellerStatus(
        req.params.id,
        status,
        req.user!.id,
        note,
        rejectionReason
      );
      if (!updated) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }
      const actionType = status === 'approved' ? 'seller_approved' : 
                        status === 'rejected' ? 'seller_rejected' : 'settings_changed';
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: actionType as any,
        targetType: 'user',
        targetId: req.params.id,
        previousValue: JSON.stringify({ status: vendorBefore.userProfile?.onboardingStatus }),
        newValue: JSON.stringify({ status, note, rejectionReason }),
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown',
      });
      res.json(updated);
    } catch (error) {
      console.error("Error updating vendor status:", error);
      res.status(500).json({ error: "Failed to update vendor status" });
    }
  });

  /**
   * @swagger
   * /admin/sellers/{id}/suspend:
   *   post:
   *     tags: [Admin - Sellers]
   *     summary: Suspend a seller account
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [reason]
   *             properties:
   *               reason:
   *                 type: string
   *     responses:
   *       200:
   *         description: Seller suspended
   */
  app.post("/api/admin/sellers/:id/suspend", requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ error: "Suspension reason is required" });
      }
      
      const suspended = await storage.suspendUser(req.params.id, req.user!.id, reason);
      
      if (!suspended) {
        return res.status(404).json({ error: "Seller not found" });
      }
      
      // Log admin action
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'seller_suspended',
        targetType: 'user',
        targetId: req.params.id,
        newValue: JSON.stringify({ reason }),
        ipAddress: getClientIp(req),
      });
      
      res.json({ success: true, user: suspended });
    } catch (error) {
      console.error("Error suspending seller:", error);
      res.status(500).json({ error: "Failed to suspend seller" });
    }
  });

  /**
   * @swagger
   * /admin/vendors/{id}/suspend:
   *   post:
   *     tags: [Admin - Vendors]
   *     summary: Suspend a vendor account
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [reason]
   *             properties:
   *               reason:
   *                 type: string
   *     responses:
   *       200:
   *         description: Vendor suspended
   */
  app.post("/api/admin/vendors/:id/suspend", requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ error: "Suspension reason is required" });
      }
      const suspended = await storage.suspendUser(req.params.id, req.user!.id, reason);
      if (!suspended) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'seller_suspended',
        targetType: 'user',
        targetId: req.params.id,
        newValue: JSON.stringify({ reason }),
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown',
      });
      res.json({ success: true, user: suspended });
    } catch (error) {
      console.error("Error suspending vendor:", error);
      res.status(500).json({ error: "Failed to suspend vendor" });
    }
  });

  /**
   * @swagger
   * /admin/sellers/{id}/activate:
   *   post:
   *     tags: [Admin - Sellers]
   *     summary: Activate a suspended seller account
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
   *         description: Seller activated
   */
  app.post("/api/admin/sellers/:id/activate", requireAdmin, async (req, res) => {
    try {
      const activated = await storage.activateUser(req.params.id, req.user!.id);
      
      if (!activated) {
        return res.status(404).json({ error: "Seller not found" });
      }
      
      // Log admin action
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'seller_activated',
        targetType: 'user',
        targetId: req.params.id,
        ipAddress: getClientIp(req),
      });
      
      res.json({ success: true, user: activated });
    } catch (error) {
      console.error("Error activating seller:", error);
      res.status(500).json({ error: "Failed to activate seller" });
    }
  });

  /**
   * @swagger
   * /admin/vendors/{id}/activate:
   *   post:
   *     tags: [Admin - Vendors]
   *     summary: Activate a suspended vendor account
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
   *         description: Vendor activated
   */
  app.post("/api/admin/vendors/:id/activate", requireAdmin, async (req, res) => {
    try {
      const activated = await storage.activateUser(req.params.id, req.user!.id);
      if (!activated) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'seller_activated',
        targetType: 'user',
        targetId: req.params.id,
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown',
      });
      res.json({ success: true, user: activated });
    } catch (error) {
      console.error("Error activating vendor:", error);
      res.status(500).json({ error: "Failed to activate vendor" });
    }
  });

  /**
   * @swagger
   * /admin/action-logs:
   *   get:
   *     tags: [Admin]
   *     summary: Get admin action logs
   *     description: Returns audit trail of admin actions
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: adminId
   *         schema:
   *           type: string
   *       - in: query
   *         name: actionType
   *         schema:
   *           type: string
   *       - in: query
   *         name: targetType
   *         schema:
   *           type: string
   *       - in: query
   *         name: targetId
   *         schema:
   *           type: string
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Paginated list of admin action logs
   */
  app.get("/api/admin/action-logs", requireAdmin, async (req, res) => {
    try {
      const { adminId, actionType, targetType, targetId, page, limit } = req.query;
      
      const result = await storage.getAdminActionLogs({
        adminId: adminId as string,
        actionType: actionType as string,
        targetType: targetType as string,
        targetId: targetId as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching admin action logs:", error);
      res.status(500).json({ error: "Failed to fetch action logs" });
    }
  });

  /**
   * @swagger
   * /admin/admins:
   *   get:
   *     tags: [Admin]
   *     summary: Get all admin users
   *     description: Returns list of admin and super_admin users
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: List of admin users
   */
  app.get("/api/admin/admins", requireAdmin, async (req, res) => {
    try {
      const admins = await storage.getAllAdmins();
      res.json(admins);
    } catch (error) {
      console.error("Error fetching admins:", error);
      res.status(500).json({ error: "Failed to fetch admins" });
    }
  });

  /**
   * @swagger
   * /admin/admins:
   *   post:
   *     tags: [Admin]
   *     summary: Create a new admin user
   *     description: Admins and super_admin can create new admin users
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, email, password]
   *             properties:
   *               name: { type: string }
   *               email: { type: string, format: email }
   *               password: { type: string, minLength: 6 }
   *     responses:
   *       201:
   *         description: Admin created successfully
   *       403:
   *         description: Only super_admin can create admins
   */
  app.post("/api/admin/admins", requireAdmin, async (req, res) => {
    try {
      
      const { name, email, password } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      
      // Check if email exists
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const admin = await storage.createAdmin({
        name,
        email,
        password: hashedPassword,
        userType: 'admin',
      });
      
      // Log admin action
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'admin_created',
        targetType: 'user',
        targetId: admin.id,
        newValue: JSON.stringify({ name, email }),
        ipAddress: getClientIp(req),
      });
      
      res.status(201).json({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        userType: admin.userType,
        createdAt: admin.createdAt,
      });
    } catch (error) {
      console.error("Error creating admin:", error);
      res.status(500).json({ error: "Failed to create admin" });
    }
  });

  // ===== PRODUCT REFERENCE DATA APIs =====

  /**
   * @swagger
   * /products/reference/{type}:
   *   get:
   *     tags: [Products]
   *     summary: Get product reference data
   *     description: Returns reference data for product dropdowns (sizes, colors, features, etc.)
   *     parameters:
   *       - in: path
   *         name: type
   *         required: true
   *         schema:
   *           type: string
   *           enum: [sizes, colors, features, performance, thickness, materials, driveTypes, dimensionUnits, weightUnits, controlledItemTypes, pricingTerms, manufacturingSources]
   *     responses:
   *       200:
   *         description: Reference data list
   */
  app.get("/api/products/reference/:type", async (req, res) => {
    try {
      const data = await storage.getProductReferenceData(req.params.type);
      res.json(data);
    } catch (error) {
      console.error("Error fetching product reference data:", error);
      res.status(500).json({ error: "Failed to fetch reference data" });
    }
  });

  // ===== VENDOR PRODUCT APIs =====

  /**
   * @swagger
   * /vendor/products:
   *   get:
   *     tags: [Vendor Products]
   *     summary: List vendor's products
    *     description: |
    *       Returns paginated list of vendor's products with optional filters.
    *       Accessible by vendors for their own products and by admins/super_admins
    *       to inspect vendor-created products.
    *     security:
    *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [draft, pending_review, approved, rejected, suspended]
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200:
  *         description: Paginated list of vendor products
  *       401:
  *         description: Not authenticated
   */
  app.get("/api/vendor/products", async (req, res) => {
    if (!isVendorOrAdmin(req.user)) {
      return res.status(401).json({ error: "Vendor authentication required" });
    }

    try {
      const { status, search, page, limit } = req.query;
      const result = await storage.getVendorProducts(req.user!.id, {
        status: status as string,
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching vendor products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  /**
   * @swagger
   * /vendor/products:
   *   post:
   *     tags: [Vendor Products]
   *     summary: Create a new product draft
   *     description: |
  *       Creates a new product in draft status for the authenticated vendor.
  *       Admins and super admins may also call this endpoint to create
  *       drafts on behalf of a vendor account.
  *       This initializes an empty product that can be populated through PATCH updates.
  *       Use the returned product ID to update product data via PATCH /vendor/products/{id}.
   *     security:
   *       - bearerAuth: []
    *     requestBody:
    *       required: false
    *       description: Optional initial data for the product. Any fields from VendorProductInput can be provided.
    *       content:
    *         application/json:
    *           schema:
    *             $ref: '#/components/schemas/VendorProductInput'
    *           examples:
    *             basicInfo:
    *               summary: Minimal basic information to start a product
    *               value:
    *                 name: "Armored Door Panel - Level 4"
    *                 sku: "ADP-L4-2024"
    *                 mainCategoryId: 1
    *                 categoryId: 5
    *                 countryOfOrigin: "USA"
    *                 condition: "new"
    *             fullCreate:
    *               summary: More complete product creation payload
    *               value:
    *                 name: "Armored Door Panel - Level 4"
    *                 sku: "ADP-L4-2024"
    *                 mainCategoryId: 1
    *                 categoryId: 5
    *                 subCategoryId: 12
    *                 vehicleCompatibility: "Land Cruiser 200 Series (2008-2021)"
    *                 certifications: "NIJ Level IV, VPAM BRV 2009"
    *                 countryOfOrigin: "USA"
    *                 controlledItemType: "Ballistic Protection"
    *                 dimensionLength: 120.5
    *                 dimensionWidth: 80.3
    *                 dimensionHeight: 5.2
    *                 dimensionUnit: "cm"
    *                 materials: ["Hardened Steel", "Kevlar Composite", "Ceramic Plates"]
    *                 features: ["Blast Resistant", "Corrosion Protected", "Lightweight Design"]
    *                 performance: ["Stops 7.62x51mm NATO", "Multi-hit Capable", "Fragmentation Protection"]
    *                 technicalDescription: "Advanced composite armor door panel designed for high-threat environments..."
    *                 driveTypes: ["4WD", "AWD"]
    *                 sizes: ["Standard", "Extended"]
    *                 thickness: ["25mm", "30mm", "35mm"]
    *                 colors: ["Black", "Gray", "Tan"]
    *                 weightValue: 45.5
    *                 weightUnit: "kg"
    *                 packingLength: 130
    *                 packingWidth: 90
    *                 packingHeight: 15
    *                 packingDimensionUnit: "cm"
    *                 packingWeight: 50
    *                 packingWeightUnit: "kg"
    *                 basePrice: 4599.99
    *                 currency: "USD"
    *                 stock: 25
    *                 minOrderQuantity: 2
    *                 condition: "new"
    *                 make: "Toyota"
    *                 model: "Land Cruiser"
    *                 year: 2024
    *                 readyStockAvailable: true
    *                 pricingTerms: ["FOB", "CIF"]
    *                 productionLeadTime: 45
    *                 manufacturingSource: "OEM"
    *                 manufacturingSourceName: "ArmorTech Industries"
    *                 requiresExportLicense: true
    *                 hasWarranty: true
    *                 warrantyDuration: 24
    *                 warrantyDurationUnit: "months"
    *                 warrantyTerms: "Full coverage against manufacturing defects. Installation warranty separate."
    *                 complianceConfirmed: true
    *                 supplierSignature: "John Doe - 2024-12-23"
    *                 vehicleFitment: "Front left door, armored variant"
    *                 specifications: "STANAG Level 2, multi-hit protection, blast-resistant hinges"
    *                 description: "Premium armored door panel for military and VIP vehicles"
    *                 warranty: "5 years against armor failure, 1 year hardware"
    *                 actionType: "buy_now"
    *                 isFeatured: false
    *                 image: "https://cdn.armoredmart.com/products/adp-l4/main.jpg"
    *                 gallery:
    *                   - "https://cdn.armoredmart.com/products/adp-l4/main.jpg"
    *                   - "https://cdn.armoredmart.com/products/adp-l4/detail-1.jpg"
   *     responses:
   *       201:
   *         description: Product draft created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/VendorProduct'
  *       401:
  *         description: Not authenticated or not authorized (vendor or admin required)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post("/api/vendor/products", async (req, res) => {
    if (!isVendorOrAdmin(req.user)) {
      return res.status(401).json({ error: "Vendor authentication required" });
    }

    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const product = await storage.createProductDraft(req.user.id);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product draft:", error);
      res.status(500).json({ error: "Failed to create product draft" });
    }
  });

  /**
   * @swagger
   * /vendor/products/{id}:
   *   get:
   *     tags: [Vendor Products]
   *     summary: Get product details
  *     description: |
  *       Returns full product details including media and pricing tiers.
  *       Vendors can access only their own products; admins/super_admins can
  *       access any vendor-created product.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: Product details
   *       404:
   *         description: Product not found
   */
  app.get("/api/vendor/products/:id", async (req, res) => {
    if (!isVendorOrAdmin(req.user)) {
      return res.status(401).json({ error: "Vendor authentication required" });
    }

    try {
      const product = await storage.getProductWithDetails(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (product.vendorId !== req.user!.id && req.user!.userType === 'vendor') {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  /**
   * @swagger
   * /vendor/products/{id}:
   *   patch:
   *     tags: [Vendor Products]
   *     summary: Update product data
   *     description: |
  *       Updates product fields (auto-saves as draft). Submit any combination of product fields.
  *       The product remains in draft status until explicitly submitted for review.
  *       See VendorProductInput schema for all available fields organized by tabs.
  *       Vendors may update only their own products; admins/super_admins may
  *       update any vendor-created product.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *         description: Product ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/VendorProductInput'
   *           examples:
   *             basicInfo:
   *               summary: Tab 1 - Basic Information
   *               value:
   *                 name: "Armored Door Panel - Level 4"
   *                 sku: "ADP-L4-2024"
   *                 mainCategoryId: 1
   *                 categoryId: 5
   *                 vehicleCompatibility: "Land Cruiser 200 Series"
   *                 certifications: "NIJ Level IV"
   *                 countryOfOrigin: "USA"
   *             technicalSpecs:
   *               summary: Tab 2 - Technical Specifications
   *               value:
   *                 dimensionLength: 120.5
   *                 dimensionWidth: 80.3
   *                 dimensionHeight: 5.2
   *                 dimensionUnit: "cm"
   *                 materials: ["Hardened Steel", "Kevlar Composite"]
   *                 features: ["Blast Resistant", "Corrosion Protected"]
   *                 technicalDescription: "Advanced composite armor..."
   *             variants:
   *               summary: Tab 2 - Available Variants
   *               value:
   *                 driveTypes: ["4WD", "AWD"]
   *                 sizes: ["Standard", "Extended"]
   *                 thickness: ["25mm", "30mm"]
   *                 colors: ["Black", "Gray"]
   *                 weightValue: 45.5
   *                 weightUnit: "kg"
   *                 minOrderQuantity: 2
   *             pricing:
   *               summary: Tab 3 - Pricing & Availability
   *               value:
   *                 basePrice: 4599.99
   *                 currency: "USD"
   *                 pricingTerms: ["FOB", "CIF"]
   *                 productionLeadTime: 45
   *                 readyStockAvailable: true
   *                 stock: 25
   *             compliance:
   *               summary: Tab 5 - Compliance & Declarations
   *               value:
   *                 manufacturingSource: "OEM"
   *                 requiresExportLicense: true
   *                 hasWarranty: true
   *                 warrantyDuration: 24
   *                 warrantyDurationUnit: "months"
   *                 complianceConfirmed: true
   *     responses:
   *       200:
   *         description: Product updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/VendorProduct'
   *       404:
   *         description: Product not found
   *       403:
   *         description: Access denied - not your product
   */
  app.patch("/api/vendor/products/:id", async (req, res) => {
    if (!isVendorOrAdmin(req.user)) {
      return res.status(401).json({ error: "Vendor authentication required" });
    }

    try {
      const product = await storage.getProductById(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (product.vendorId !== req.user!.id && req.user!.userType === 'vendor') {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Validate category IDs if provided
      const { mainCategoryId, categoryId, subCategoryId } = req.body;
      const categoryIds = [mainCategoryId, categoryId, subCategoryId].filter(id => id !== undefined);
      
      if (categoryIds.length > 0) {
        const validCategories = await storage.validateCategoryIds(categoryIds);
        const invalidIds = categoryIds.filter(id => !validCategories.includes(id));
        
        if (invalidIds.length > 0) {
          return res.status(400).json({ 
            error: "Invalid category IDs", 
            invalidIds,
            message: `The following category IDs do not exist: ${invalidIds.join(', ')}`
          });
        }
      }
      
      const updated = await storage.updateProductData(parseInt(req.params.id), req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  /**
   * @swagger
   * /vendor/products/{id}/submit:
   *   post:
   *     tags: [Vendor Products]
   *     summary: Submit product for review
  *     description: |
  *       Submits a draft product for admin review.
  *       Vendors may submit only their own drafts; admins/super_admins may
  *       submit any vendor-created draft for review.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: Product submitted for review
   *       400:
   *         description: Product not ready for submission
   */
  app.post("/api/vendor/products/:id/submit", async (req, res) => {
    if (!isVendorOrAdmin(req.user)) {
      return res.status(401).json({ error: "Vendor authentication required" });
    }

    try {
      const product = await storage.getProductById(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (product.vendorId !== req.user!.id && req.user!.userType === 'vendor') {
        return res.status(403).json({ error: "Access denied" });
      }
      if (product.status !== 'draft' && product.status !== 'rejected') {
        return res.status(400).json({ error: "Only draft or rejected products can be submitted" });
      }
      
      const updated = await storage.submitProductForReview(parseInt(req.params.id));
      res.json(updated);
    } catch (error) {
      console.error("Error submitting product:", error);
      res.status(500).json({ error: "Failed to submit product" });
    }
  });

  /**
   * @swagger
   * /vendor/products/{id}:
   *   delete:
   *     tags: [Vendor Products]
   *     summary: Delete a product
  *     description: |
  *       Deletes a product (only drafts can be deleted).
  *       Vendors can delete only their own draft products, while admins/super_admins
  *       can delete any vendor-created draft product.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       204:
   *         description: Product deleted
   *       400:
   *         description: Cannot delete non-draft product
   */
  app.delete("/api/vendor/products/:id", async (req, res) => {
    if (!isVendorOrAdmin(req.user)) {
      return res.status(401).json({ error: "Vendor authentication required" });
    }

    try {
      const product = await storage.getProductById(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (product.vendorId !== req.user!.id && req.user!.userType === 'vendor') {
        return res.status(403).json({ error: "Access denied" });
      }
      if (product.status !== 'draft') {
        return res.status(400).json({ error: "Only draft products can be deleted" });
      }
      
      await storage.deleteProduct(parseInt(req.params.id), product.vendorId!);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  /**
   * @swagger
   * /vendor/products/{id}/media:
   *   post:
   *     tags: [Vendor Products]
   *     summary: Add product media
  *     description: |
  *       Adds an image or file to the product.
  *       Vendors can modify media only for their own products; admins/super_admins
  *       can modify media for any vendor-created product.
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
   *             required: [type, url]
   *             properties:
   *               type: { type: string, enum: [product_image, cad_file, certificate, msds, manual, video] }
   *               url: { type: string }
   *               fileName: { type: string }
   *               fileSize: { type: integer }
   *               mimeType: { type: string }
   *               isCover: { type: boolean }
   *               displayOrder: { type: integer }
   *     responses:
   *       201:
   *         description: Media added
   */
  app.post("/api/vendor/products/:id/media", async (req, res) => {
    if (!isVendorOrAdmin(req.user)) {
      return res.status(401).json({ error: "Vendor authentication required" });
    }

    try {
      const product = await storage.getProductById(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (product.vendorId !== req.user!.id && req.user!.userType === 'vendor') {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const media = await storage.addProductMedia({
        productId: parseInt(req.params.id),
        ...req.body,
      });
      res.status(201).json(media);
    } catch (error) {
      console.error("Error adding product media:", error);
      res.status(500).json({ error: "Failed to add media" });
    }
  });

  /**
   * @swagger
   * /vendor/products/{id}/media/{mediaId}:
   *   delete:
   *     tags: [Vendor Products]
   *     summary: Delete product media
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *       - in: path
   *         name: mediaId
   *         required: true
   *         schema: { type: integer }
  *     responses:
  *       204:
  *         description: Media deleted
   */
  app.delete("/api/vendor/products/:id/media/:mediaId", async (req, res) => {
    if (!isVendorOrAdmin(req.user)) {
      return res.status(401).json({ error: "Vendor authentication required" });
    }

    try {
      const product = await storage.getProductById(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (product.vendorId !== req.user!.id && req.user!.userType === 'vendor') {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteProductMedia(parseInt(req.params.mediaId));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product media:", error);
      res.status(500).json({ error: "Failed to delete media" });
    }
  });

  /**
   * @swagger
   * /vendor/products/{id}/media/{mediaId}/cover:
   *   post:
   *     tags: [Vendor Products]
   *     summary: Set cover image
  *     description: |
  *       Sets a media item as the product cover image.
  *       Vendors can do this only for their own products; admins/super_admins
  *       can do this for any vendor-created product.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *       - in: path
   *         name: mediaId
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: Cover image set
   */
  app.post("/api/vendor/products/:id/media/:mediaId/cover", async (req, res) => {
    if (!isVendorOrAdmin(req.user)) {
      return res.status(401).json({ error: "Vendor authentication required" });
    }

    try {
      const product = await storage.getProductById(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (product.vendorId !== req.user!.id && req.user!.userType === 'vendor') {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.setProductCoverImage(parseInt(req.params.id), parseInt(req.params.mediaId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting cover image:", error);
      res.status(500).json({ error: "Failed to set cover image" });
    }
  });

  /**
   * @swagger
   * /vendor/products/{id}/pricing-tiers:
   *   put:
   *     tags: [Vendor Products]
   *     summary: Set pricing tiers
  *     description: |
  *       Replaces all pricing tiers for a product.
  *       Vendors can manage pricing tiers only for their own products; admins/super_admins
  *       can manage pricing tiers for any vendor-created product.
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
   *             properties:
   *               tiers:
   *                 type: array
   *                 items:
   *                   type: object
   *                   required: [minQuantity, price]
   *                   properties:
   *                     minQuantity: { type: integer }
   *                     maxQuantity: { type: integer }
   *                     price: { type: number }
   *     responses:
   *       200:
   *         description: Pricing tiers updated
   */
  app.put("/api/vendor/products/:id/pricing-tiers", async (req, res) => {
    if (!isVendorOrAdmin(req.user)) {
      return res.status(401).json({ error: "Vendor authentication required" });
    }

    try {
      const product = await storage.getProductById(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (product.vendorId !== req.user!.id && req.user!.userType === 'vendor') {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { tiers } = req.body;
      const tiersWithProductId = (tiers || []).map((tier: any) => ({
        ...tier,
        productId: parseInt(req.params.id),
      }));
      
      const updatedTiers = await storage.setProductPricingTiers(parseInt(req.params.id), tiersWithProductId);
      res.json(updatedTiers);
    } catch (error) {
      console.error("Error setting pricing tiers:", error);
      res.status(500).json({ error: "Failed to set pricing tiers" });
    }
  });

  // ===== ADMIN PRODUCT APIs =====

  /**
   * @swagger
   * /admin/products:
   *   get:
   *     tags: [Admin Products]
   *     summary: List all products for admin
   *     description: Returns paginated list of all products with optional filters
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [draft, pending_review, approved, rejected, suspended]
   *       - in: query
   *         name: vendorId
   *         schema: { type: string }
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *       - in: query
   *         name: isFeatured
   *         schema: { type: boolean }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200:
   *         description: Paginated list of products
   *       401:
   *         description: Not authenticated
   */
  app.get("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const { status, vendorId, search, isFeatured, page, limit } = req.query;
      const result = await storage.getProductsForAdmin({
        status: status as string,
        vendorId: vendorId as string,
        search: search as string,
        isFeatured: isFeatured === 'true' ? true : isFeatured === 'false' ? false : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching products for admin:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  /**
   * @swagger
   * /admin/products/vendors:
   *   get:
   *     tags: [Admin Products]
   *     summary: List all vendor-created products
   *     description: |
   *       Returns a paginated list of products that were created by vendors.
   *       A product is considered vendor-created if it has a non-null vendorId.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [draft, pending_review, approved, rejected, suspended]
   *       - in: query
   *         name: vendorId
   *         schema: { type: string }
   *         description: Optional filter to show products for a specific vendor
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *       - in: query
   *         name: isFeatured
   *         schema: { type: boolean }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200:
   *         description: Paginated list of vendor-created products
   *       401:
   *         description: Not authenticated
   */
  app.get("/api/admin/products/vendors", requireAdmin, async (req, res) => {
    try {
      const { status, vendorId, search, isFeatured, page, limit } = req.query;
      const result = await storage.getProductsForAdmin({
        status: status as string,
        vendorId: vendorId as string,
        search: search as string,
        isFeatured: isFeatured === 'true' ? true : isFeatured === 'false' ? false : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching vendor-created products for admin:", error);
      res.status(500).json({ error: "Failed to fetch vendor-created products" });
    }
  });

  /**
   * @swagger
   * /admin/products/{id}:
   *   get:
   *     tags: [Admin Products]
   *     summary: Get product details for admin
   *     description: Returns full product details including media, pricing, and vendor info
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: Product details
   *       404:
   *         description: Product not found
   */
  app.get("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      const product = await storage.getProductWithDetails(parseInt(req.params.id));
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
   * /admin/products/{id}/approve:
   *   post:
   *     tags: [Admin Products]
   *     summary: Approve a product
   *     description: Approves a pending product for listing
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               note: { type: string }
   *     responses:
   *       200:
   *         description: Product approved
   */
  app.post("/api/admin/products/:id/approve", requireAdmin, async (req, res) => {
    try {
      const { note } = req.body;
      const product = await storage.approveProduct(parseInt(req.params.id), req.user!.id, note);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'product_approved',
        targetType: 'product',
        targetId: req.params.id,
        newValue: 'approved',
        note,
        ipAddress: getClientIp(req),
      });
      
      res.json(product);
    } catch (error) {
      console.error("Error approving product:", error);
      res.status(500).json({ error: "Failed to approve product" });
    }
  });

  /**
   * @swagger
   * /admin/products/{id}/reject:
   *   post:
   *     tags: [Admin Products]
   *     summary: Reject a product
   *     description: Rejects a product with a reason
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
   *             required: [reason]
   *             properties:
   *               reason: { type: string }
   *     responses:
   *       200:
   *         description: Product rejected
   */
  app.post("/api/admin/products/:id/reject", requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }
      
      const product = await storage.rejectProduct(parseInt(req.params.id), req.user!.id, reason);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'product_rejected',
        targetType: 'product',
        targetId: req.params.id,
        newValue: 'rejected',
        note: reason,
        ipAddress: getClientIp(req),
      });
      
      res.json(product);
    } catch (error) {
      console.error("Error rejecting product:", error);
      res.status(500).json({ error: "Failed to reject product" });
    }
  });

  /**
   * @swagger
   * /admin/products/{id}/suspend:
   *   post:
   *     tags: [Admin Products]
   *     summary: Suspend a product
   *     description: Suspends an approved product
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
   *             required: [reason]
   *             properties:
   *               reason: { type: string }
   *     responses:
   *       200:
   *         description: Product suspended
   */
  app.post("/api/admin/products/:id/suspend", requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ error: "Suspension reason is required" });
      }
      
      const product = await storage.suspendProduct(parseInt(req.params.id), req.user!.id, reason);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'product_approved', // Using existing enum
        targetType: 'product',
        targetId: req.params.id,
        previousValue: 'approved',
        newValue: 'suspended',
        note: reason,
        ipAddress: getClientIp(req),
      });
      
      res.json(product);
    } catch (error) {
      console.error("Error suspending product:", error);
      res.status(500).json({ error: "Failed to suspend product" });
    }
  });

  /**
   * @swagger
   * /admin/products/{id}/feature:
   *   post:
   *     tags: [Admin Products]
   *     summary: Feature/unfeature a product
   *     description: Toggles the featured status of a product
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
   *             required: [featured]
   *             properties:
   *               featured: { type: boolean }
   *     responses:
   *       200:
   *         description: Product feature status updated
   */
  app.post("/api/admin/products/:id/feature", requireAdmin, async (req, res) => {
    try {
      const { featured } = req.body;
      
      if (typeof featured !== 'boolean') {
        return res.status(400).json({ error: "Featured must be a boolean" });
      }
      
      const product = await storage.featureProduct(parseInt(req.params.id), featured);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: featured ? 'product_featured' : 'product_unfeatured',
        targetType: 'product',
        targetId: req.params.id,
        newValue: featured ? 'featured' : 'unfeatured',
        ipAddress: getClientIp(req),
      });
      
      res.json(product);
    } catch (error) {
      console.error("Error featuring product:", error);
      res.status(500).json({ error: "Failed to feature product" });
    }
  });

  /**
   * @swagger
   * /admin/products/{id}/notes:
   *   post:
   *     tags: [Admin Products]
   *     summary: Add a review note to a product
   *     description: Adds admin feedback/comment to a product for the seller to see
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
   *             required: [message]
   *             properties:
   *               message: { type: string }
   *               requiresChanges: { type: boolean, description: "Flag if seller needs to make changes" }
   *               isVisibleToSeller: { type: boolean, default: true }
   *     responses:
   *       201:
   *         description: Note added
   */
  app.post("/api/admin/products/:id/notes", requireAdmin, async (req, res) => {
    try {
      const { message, requiresChanges, isVisibleToSeller } = req.body;
      
      if (!message || message.trim() === '') {
        return res.status(400).json({ error: "Message is required" });
      }
      
      const product = await storage.getProductById(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      const note = await storage.addProductReviewNote({
        productId: parseInt(req.params.id),
        adminId: req.user!.id,
        message: message.trim(),
        requiresChanges: requiresChanges ?? false,
        isVisibleToSeller: isVisibleToSeller ?? true,
      });
      
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'product_note_added',
        targetType: 'product',
        targetId: req.params.id,
        note: message.substring(0, 100),
        ipAddress: getClientIp(req),
      });
      
      res.status(201).json(note);
    } catch (error) {
      console.error("Error adding product note:", error);
      res.status(500).json({ error: "Failed to add note" });
    }
  });

  /**
   * @swagger
   * /admin/products/{id}/notes:
   *   get:
   *     tags: [Admin Products]
   *     summary: Get all review notes for a product
   *     description: Returns all admin notes for a product (including internal notes)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: List of review notes
   */
  app.get("/api/admin/products/:id/notes", requireAdmin, async (req, res) => {
    try {
      const notes = await storage.getProductReviewNotes(parseInt(req.params.id), false);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching product notes:", error);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  /**
   * @swagger
   * /vendor/products/{id}/notes:
   *   get:
   *     tags: [Vendor Products]
   *     summary: Get admin feedback on a product
  *     description: |
  *       Returns admin notes/feedback visible to the seller.
  *       Vendors see notes on their own products; admins/super_admins can
  *       view notes for any vendor-created product.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200:
   *         description: List of visible review notes
   */
  app.get("/api/vendor/products/:id/notes", async (req, res) => {
    if (!isVendorOrAdmin(req.user)) {
      return res.status(401).json({ error: "Vendor authentication required" });
    }

    try {
      const product = await storage.getProductById(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (product.vendorId !== req.user!.id && req.user!.userType === 'vendor') {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const notes = await storage.getProductReviewNotes(parseInt(req.params.id), true);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching product notes:", error);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  // ===== ADMIN VENDOR ONBOARDING APIs =====

  /**
   * @swagger
   * /admin/vendors:
   *   get:
   *     tags: [Admin Vendors]
   *     summary: List vendors for admin review
   *     description: Returns paginated list of vendors. By default shows only vendors pending approval (under_review status).
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, in_progress, pending_verification, under_review, approved, rejected, suspended]
   *         description: Filter by onboarding status. Defaults to 'under_review' if not specified.
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *         description: Search by company name, email, or user name
   *       - in: query
   *         name: country
   *         schema: { type: string }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200:
   *         description: Paginated list of vendors
   */
  app.get("/api/admin/vendors", requireAdmin, async (req, res) => {
    try {
      const { status, search, country, category, page, limit } = req.query;
      const result = await storage.getVendorsForAdmin({
        status: status as string,
        search: search as string,
        country: country as string,
        category: category as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  /**
   * @swagger
   * /admin/vendors/{userId}:
   *   get:
   *     tags: [Admin Vendors]
   *     summary: Get vendor details
   *     description: Returns full vendor profile including user info and onboarding details
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Vendor profile details
   *       404:
   *         description: Vendor not found
   */
  app.get("/api/admin/vendors/:userId", requireAdmin, async (req, res) => {
    try {
      const profile = await storage.getUserProfileByUserId(req.params.userId);
      if (!profile) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      const user = await storage.getUser(req.params.userId);
      res.json({ ...profile, user });
    } catch (error) {
      console.error("Error fetching vendor:", error);
      res.status(500).json({ error: "Failed to fetch vendor" });
    }
  });

  /**
   * @swagger
   * /admin/vendors/{userId}/approve:
   *   post:
   *     tags: [Admin Vendors]
   *     summary: Approve vendor onboarding
   *     description: Approves a vendor's onboarding application and activates their account
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               note: { type: string }
   *     responses:
   *       200:
   *         description: Vendor approved
   */
  app.post("/api/admin/vendors/:userId/approve", requireAdmin, async (req, res) => {
    try {
      const { note } = req.body;
      const profile = await storage.approveVendorOnboarding(req.params.userId, req.user!.id, note);
      
      if (!profile) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'seller_approved',
        targetType: 'user',
        targetId: req.params.userId,
        newValue: 'approved',
        note,
        ipAddress: getClientIp(req),
      });
      
      res.json(profile);
    } catch (error) {
      console.error("Error approving vendor:", error);
      res.status(500).json({ error: "Failed to approve vendor" });
    }
  });

  /**
   * @swagger
   * /admin/vendors/{userId}/reject:
   *   post:
   *     tags: [Admin Vendors]
   *     summary: Reject vendor onboarding
   *     description: Rejects a vendor's onboarding application with a reason
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [reason]
   *             properties:
   *               reason: { type: string }
   *               note: { type: string }
   *     responses:
   *       200:
   *         description: Vendor rejected
   */
  app.post("/api/admin/vendors/:userId/reject", requireAdmin, async (req, res) => {
    try {
      const { reason, note } = req.body;
      
      if (!reason) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }
      
      const profile = await storage.rejectVendorOnboarding(req.params.userId, req.user!.id, reason, note);
      
      if (!profile) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'seller_rejected',
        targetType: 'user',
        targetId: req.params.userId,
        newValue: 'rejected',
        note: reason,
        ipAddress: getClientIp(req),
      });
      
      res.json(profile);
    } catch (error) {
      console.error("Error rejecting vendor:", error);
      res.status(500).json({ error: "Failed to reject vendor" });
    }
  });

  /**
   * @swagger
   * /admin/vendors/{userId}/suspend:
   *   post:
   *     tags: [Admin Vendors]
   *     summary: Suspend a vendor
   *     description: Suspends an approved vendor's account
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [reason]
   *             properties:
   *               reason: { type: string }
   *     responses:
   *       200:
   *         description: Vendor suspended
   */
  app.post("/api/admin/vendors/:userId/suspend", requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ error: "Suspension reason is required" });
      }
      
      const profile = await storage.suspendVendor(req.params.userId, req.user!.id, reason);
      
      if (!profile) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'seller_suspended',
        targetType: 'user',
        targetId: req.params.userId,
        previousValue: 'approved',
        newValue: 'suspended',
        note: reason,
        ipAddress: getClientIp(req),
      });
      
      res.json(profile);
    } catch (error) {
      console.error("Error suspending vendor:", error);
      res.status(500).json({ error: "Failed to suspend vendor" });
    }
  });

  /**
   * @swagger
   * /admin/vendors/{userId}/reactivate:
   *   post:
   *     tags: [Admin Vendors]
   *     summary: Reactivate a suspended vendor
   *     description: Reactivates a suspended vendor's account
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               note: { type: string }
   *     responses:
   *       200:
   *         description: Vendor reactivated
   */
  app.post("/api/admin/vendors/:userId/reactivate", requireAdmin, async (req, res) => {
    try {
      const { note } = req.body;
      const profile = await storage.reactivateVendor(req.params.userId, req.user!.id, note);
      
      if (!profile) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'seller_activated',
        targetType: 'user',
        targetId: req.params.userId,
        previousValue: 'suspended',
        newValue: 'approved',
        note,
        ipAddress: getClientIp(req),
      });
      
      res.json(profile);
    } catch (error) {
      console.error("Error reactivating vendor:", error);
      res.status(500).json({ error: "Failed to reactivate vendor" });
    }
  });

  // ===== VENDOR ONBOARDING STATUS API =====

  /**
   * @swagger
   * /vendor/onboarding/status:
   *   get:
   *     tags: [Vendor Onboarding]
   *     summary: Get vendor's onboarding status
   *     description: Returns the vendor's current onboarding status and any rejection reasons
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Onboarding status details
   */
  app.get("/api/vendor/onboarding/status", async (req, res) => {
    if (!req.user || req.user.userType !== 'vendor') {
      return res.status(401).json({ error: "Vendor authentication required" });
    }
    
    try {
      const profile = await storage.getUserProfileByUserId(req.user.id);
      if (!profile) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }
      
      res.json({
        status: profile.onboardingStatus,
        currentStep: profile.currentStep,
        submittedAt: profile.submittedAt,
        reviewedAt: profile.reviewedAt,
        rejectionReason: profile.rejectionReason,
        reviewNote: profile.reviewNote,
      });
    } catch (error) {
      console.error("Error fetching onboarding status:", error);
      res.status(500).json({ error: "Failed to fetch status" });
    }
  });

  // ===== ADMIN ORDERS APIs =====

  /**
   * @swagger
   * /admin/orders:
   *   get:
   *     tags: [Admin Orders]
   *     summary: List all orders
   *     description: Returns paginated list of all orders with filters
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, processing, shipped, delivered, cancelled, returned]
   *       - in: query
   *         name: vendorId
   *         schema: { type: string }
   *         description: Filter by vendor ID
   *       - in: query
   *         name: dateFrom
   *         schema: { type: string, format: date }
   *       - in: query
   *         name: dateTo
   *         schema: { type: string, format: date }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200:
   *         description: Paginated list of orders
   */
  app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
      const { status, vendorId, dateFrom, dateTo, page, limit } = req.query;
      const result = await storage.getOrdersForAdmin({
        status: status as string,
        vendorId: vendorId as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  /**
   * @swagger
   * /admin/orders/{orderId}:
   *   get:
   *     tags: [Admin Orders]
   *     summary: Get order details
   *     description: Returns full order details including items, user, and status history
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Order details
   *       404:
   *         description: Order not found
   */
  app.get("/api/admin/orders/:orderId", requireAdmin, async (req, res) => {
    try {
      const order = await storage.getOrderByIdForAdmin(req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  /**
   * @swagger
   * /admin/orders/{orderId}/status:
   *   put:
   *     tags: [Admin Orders]
   *     summary: Update order status
   *     description: Updates the order status (admin only)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [status]
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [pending, processing, shipped, delivered, cancelled, returned]
   *               note: { type: string }
   *     responses:
   *       200:
   *         description: Order status updated
   */
  app.put("/api/admin/orders/:orderId/status", requireAdmin, async (req, res) => {
    try {
      const { status, note } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      
      const order = await storage.updateOrderStatus(req.params.orderId, status, req.user!.id, note);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'order_status_changed',
        targetType: 'order',
        targetId: req.params.orderId,
        newValue: status,
        note,
        ipAddress: getClientIp(req),
      });
      
      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // ===== VENDOR ORDERS APIs =====

  /**
   * @swagger
   * /vendor/orders:
   *   get:
   *     tags: [Vendor Orders]
   *     summary: List vendor's orders
   *     description: Returns paginated list of orders containing vendor's products
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, processing, shipped, delivered, cancelled, returned]
   *       - in: query
   *         name: dateFrom
   *         schema: { type: string, format: date }
   *       - in: query
   *         name: dateTo
   *         schema: { type: string, format: date }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200:
   *         description: Paginated list of vendor's orders
   */
  app.get("/api/vendor/orders", async (req, res) => {
    if (!req.user || req.user.userType !== 'vendor') {
      return res.status(401).json({ error: "Vendor authentication required" });
    }
    
    try {
      const { status, vendorId, dateFrom, dateTo, page, limit } = req.query;
      const result = await storage.getOrdersForVendor(req.user.id, {
        status: status as string,
        vendorId: vendorId as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching vendor orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  /**
   * @swagger
   * /vendor/orders/{orderId}:
   *   get:
   *     tags: [Vendor Orders]
   *     summary: Get order details
   *     description: Returns order details (only vendor's items)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Order details
   */
  app.get("/api/vendor/orders/:orderId", async (req, res) => {
    if (!req.user || req.user.userType !== 'vendor') {
      return res.status(401).json({ error: "Vendor authentication required" });
    }
    
    try {
      const order = await storage.getOrderByIdForAdmin(req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Filter to only show vendor's items
      const vendorItems = order.items.filter(item => item.vendorId === req.user!.id);
      if (vendorItems.length === 0) {
        return res.status(403).json({ error: "Access denied - not your order" });
      }
      
      res.json({
        ...order,
        items: vendorItems,
      });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  /**
   * @swagger
   * /vendor/orders/{orderId}/status:
   *   put:
   *     tags: [Vendor Orders]
   *     summary: Update order status
   *     description: Vendor can update order status (processing, shipped)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [status]
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [processing, shipped]
   *               note: { type: string }
   *               trackingNumber: { type: string }
   *     responses:
   *       200:
   *         description: Order status updated
   */
  app.put("/api/vendor/orders/:orderId/status", async (req, res) => {
    if (!req.user || req.user.userType !== 'vendor') {
      return res.status(401).json({ error: "Vendor authentication required" });
    }
    
    try {
      const { status, note } = req.body;
      
      // Vendors can only set to processing or shipped
      if (!['processing', 'shipped'].includes(status)) {
        return res.status(400).json({ error: "Vendors can only set status to 'processing' or 'shipped'" });
      }
      
      // Verify vendor owns items in this order
      const existingOrder = await storage.getOrderByIdForAdmin(req.params.orderId);
      if (!existingOrder) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      const vendorItems = existingOrder.items.filter(item => item.vendorId === req.user!.id);
      if (vendorItems.length === 0) {
        return res.status(403).json({ error: "Access denied - you don't have items in this order" });
      }
      
      const order = await storage.updateOrderStatus(req.params.orderId, status, req.user.id, note);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // ===== REFUND APIs (ADMIN ONLY) =====

  /**
   * @swagger
   * /admin/refunds:
   *   get:
   *     tags: [Admin Refunds]
   *     summary: List all refund requests
   *     description: Returns paginated list of refund requests for admin review
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, under_review, approved, rejected, processing, completed, failed]
   *       - in: query
   *         name: vendorId
   *         schema: { type: string }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200:
   *         description: Paginated list of refund requests
   */
  app.get("/api/admin/refunds", requireAdmin, async (req, res) => {
    try {
      const { status, vendorId, page, limit } = req.query;
      const result = await storage.getRefundsForAdmin({
        status: status as string,
        vendorId: vendorId as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching refunds:", error);
      res.status(500).json({ error: "Failed to fetch refunds" });
    }
  });

  /**
   * @swagger
   * /admin/refunds/{refundId}:
   *   get:
   *     tags: [Admin Refunds]
   *     summary: Get refund details
   *     description: Returns full refund request details
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: refundId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Refund details
   *       404:
   *         description: Refund not found
   */
  app.get("/api/admin/refunds/:refundId", requireAdmin, async (req, res) => {
    try {
      const refund = await storage.getRefundById(req.params.refundId);
      if (!refund) {
        return res.status(404).json({ error: "Refund not found" });
      }
      res.json(refund);
    } catch (error) {
      console.error("Error fetching refund:", error);
      res.status(500).json({ error: "Failed to fetch refund" });
    }
  });

  /**
   * @swagger
   * /admin/refunds/{refundId}/approve:
   *   post:
   *     tags: [Admin Refunds]
   *     summary: Approve a refund request
   *     description: Approves a customer's refund request
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: refundId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               note: { type: string }
   *     responses:
   *       200:
   *         description: Refund approved
   */
  app.post("/api/admin/refunds/:refundId/approve", requireAdmin, async (req, res) => {
    try {
      const { note } = req.body;
      const refund = await storage.approveRefund(req.params.refundId, req.user!.id, note);
      
      if (!refund) {
        return res.status(404).json({ error: "Refund not found" });
      }
      
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'refund_approved',
        targetType: 'refund',
        targetId: req.params.refundId,
        newValue: 'approved',
        note,
        ipAddress: getClientIp(req),
      });
      
      res.json(refund);
    } catch (error) {
      console.error("Error approving refund:", error);
      res.status(500).json({ error: "Failed to approve refund" });
    }
  });

  /**
   * @swagger
   * /admin/refunds/{refundId}/reject:
   *   post:
   *     tags: [Admin Refunds]
   *     summary: Reject a refund request
   *     description: Rejects a customer's refund request with a reason
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: refundId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [reason]
   *             properties:
   *               reason: { type: string }
   *               note: { type: string }
   *     responses:
   *       200:
   *         description: Refund rejected
   */
  app.post("/api/admin/refunds/:refundId/reject", requireAdmin, async (req, res) => {
    try {
      const { reason, note } = req.body;
      
      if (!reason) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }
      
      const refund = await storage.rejectRefund(req.params.refundId, req.user!.id, reason, note);
      
      if (!refund) {
        return res.status(404).json({ error: "Refund not found" });
      }
      
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'refund_rejected',
        targetType: 'refund',
        targetId: req.params.refundId,
        newValue: 'rejected',
        note: reason,
        ipAddress: getClientIp(req),
      });
      
      res.json(refund);
    } catch (error) {
      console.error("Error rejecting refund:", error);
      res.status(500).json({ error: "Failed to reject refund" });
    }
  });

  // ===== CUSTOMER REFUND REQUEST =====

  /**
   * @swagger
   * /orders/{orderId}/refund-request:
   *   post:
   *     tags: [Orders]
   *     summary: Request a refund
   *     description: Customer can request a refund for an order
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [reason, amount]
   *             properties:
   *               reason: { type: string }
   *               amount: { type: string }
   *               note: { type: string }
   *     responses:
   *       200:
   *         description: Refund request created
   */
  app.post("/api/orders/:orderId/refund-request", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      const { reason, amount, note } = req.body;
      
      if (!reason || !amount) {
        return res.status(400).json({ error: "Reason and amount are required" });
      }
      
      const order = await storage.getOrderById(req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      if (order.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied - not your order" });
      }
      
      // Get vendorId from order items (first vendor)
      const vendorId = order.items[0]?.vendorId;
      
      const refund = await storage.createRefundRequest({
        orderId: req.params.orderId,
        userId: req.user.id,
        vendorId: vendorId || undefined,
        amount,
        reason,
        customerNote: note,
      });
      
      res.json(refund);
    } catch (error) {
      console.error("Error creating refund request:", error);
      res.status(500).json({ error: "Failed to create refund request" });
    }
  });

  // ===== COMMISSION MANAGEMENT APIs =====

  /**
   * @swagger
   * /admin/settings/commission:
   *   get:
   *     tags: [Admin Settings]
   *     summary: Get global commission settings
   *     description: Returns the default commission percentage
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Commission settings
   */
  app.get("/api/admin/settings/commission", requireAdmin, async (req, res) => {
    try {
      const setting = await storage.getPlatformSetting('default_commission_percent');
      res.json({
        defaultCommissionPercent: setting?.value || '10',
        updatedAt: setting?.updatedAt,
      });
    } catch (error) {
      console.error("Error fetching commission settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  /**
   * @swagger
   * /admin/settings/commission:
   *   put:
   *     tags: [Admin Settings]
   *     summary: Update global commission settings
   *     description: Updates the default commission percentage for all vendors
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [percent]
   *             properties:
   *               percent: { type: string, description: "Commission percentage, e.g. 10 for 10%" }
   *     responses:
   *       200:
   *         description: Commission settings updated
   */
  app.put("/api/admin/settings/commission", requireAdmin, async (req, res) => {
    try {
      const { percent } = req.body;
      
      if (!percent) {
        return res.status(400).json({ error: "Percent is required" });
      }
      
      const setting = await storage.setPlatformSetting(
        'default_commission_percent',
        percent,
        req.user!.id,
        'Default commission percentage for all vendors'
      );
      
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'settings_changed',
        targetType: 'setting',
        targetId: 'default_commission_percent',
        newValue: percent,
        ipAddress: getClientIp(req),
      });
      
      res.json({
        defaultCommissionPercent: setting.value,
        updatedAt: setting.updatedAt,
      });
    } catch (error) {
      console.error("Error updating commission settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  /**
   * @swagger
   * /admin/vendors/{userId}/commission:
   *   get:
   *     tags: [Admin Vendors]
   *     summary: Get vendor's commission rate
   *     description: Returns vendor's commission percentage (custom or default)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Vendor commission info
   */
  app.get("/api/admin/vendors/:userId/commission", requireAdmin, async (req, res) => {
    try {
      // Validate vendor exists
      const vendor = await storage.getUserProfileByUserId(req.params.userId);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      
      const commission = await storage.getVendorCommission(req.params.userId);
      res.json(commission);
    } catch (error) {
      console.error("Error fetching vendor commission:", error);
      res.status(500).json({ error: "Failed to fetch commission" });
    }
  });

  /**
   * @swagger
   * /admin/vendors/{userId}/commission:
   *   put:
   *     tags: [Admin Vendors]
   *     summary: Set vendor's custom commission rate
   *     description: Sets a custom commission percentage for a specific vendor
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [percent]
   *             properties:
   *               percent: { type: string, description: "Commission percentage, e.g. 15 for 15%" }
   *     responses:
   *       200:
   *         description: Vendor commission updated
   */
  app.put("/api/admin/vendors/:userId/commission", requireAdmin, async (req, res) => {
    try {
      const { percent } = req.body;
      
      if (!percent) {
        return res.status(400).json({ error: "Percent is required" });
      }
      
      // Validate vendor exists before attempting to update
      const vendor = await storage.getUserProfileByUserId(req.params.userId);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      
      // Get current commission for logging the previous value
      const currentCommission = await storage.getVendorCommission(req.params.userId);
      
      const profile = await storage.setVendorCommission(req.params.userId, percent);
      
      if (!profile) {
        return res.status(500).json({ error: "Failed to update commission" });
      }
      
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'settings_changed',
        targetType: 'vendor_commission',
        targetId: req.params.userId,
        previousValue: currentCommission.percent,
        newValue: percent,
        ipAddress: getClientIp(req),
      });
      
      res.json({
        percent: profile.commissionPercent,
        isCustom: true,
      });
    } catch (error) {
      console.error("Error updating vendor commission:", error);
      res.status(500).json({ error: "Failed to update commission" });
    }
  });

  // ===== SUPPORT TICKET SYSTEM =====

  /**
   * @swagger
   * tags:
   *   - name: Support Tickets - Customer
   *     description: Customer-facing ticket operations
   *   - name: Support Tickets - Admin
   *     description: Admin ticket management
   */

  /**
   * @swagger
   * /tickets:
   *   post:
   *     tags: [Support Tickets - Customer]
   *     summary: Create a support ticket
   *     description: Customer creates a new support ticket for an order
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [orderId, subject, message]
   *             properties:
   *               orderId: { type: string, description: "Order ID the ticket is about" }
   *               subject: { type: string, description: "Ticket subject/title" }
   *               message: { type: string, description: "Initial message describing the issue" }
   *               priority: { type: string, enum: [low, medium, high, urgent], default: medium }
   *     responses:
   *       201:
   *         description: Ticket created successfully
   *       400:
   *         description: Invalid request
   *       404:
   *         description: Order not found
   */
  app.post("/api/tickets", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { orderId, subject, message, priority } = req.body;
      
      if (!orderId || !subject || !message) {
        return res.status(400).json({ error: "orderId, subject, and message are required" });
      }
      
      const order = await storage.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      if (order.userId !== req.user!.id) {
        return res.status(403).json({ error: "You can only create tickets for your own orders" });
      }
      
      const ticket = await storage.createTicket({
        orderId,
        customerId: req.user!.id,
        subject,
        priority: priority || 'medium',
        status: 'open',
      }, message);
      
      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating ticket:", error);
      res.status(500).json({ error: "Failed to create ticket" });
    }
  });

  /**
   * @swagger
   * /tickets:
   *   get:
   *     tags: [Support Tickets - Customer]
   *     summary: List customer's tickets
   *     description: Returns all tickets created by the authenticated customer
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [open, in_progress, waiting_customer, resolved, closed] }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *     responses:
   *       200:
   *         description: List of customer tickets
   */
  app.get("/api/tickets", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { status, page, limit } = req.query;
      
      const result = await storage.getCustomerTickets(req.user.id, {
        status: status as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  /**
   * @swagger
   * /tickets/{ticketId}:
   *   get:
   *     tags: [Support Tickets - Customer]
   *     summary: Get ticket details
   *     description: Returns full ticket details including messages (excludes internal admin notes)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: ticketId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Ticket details with messages
   *       404:
   *         description: Ticket not found
   */
  app.get("/api/tickets/:ticketId", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const ticket = await storage.getTicketById(req.params.ticketId);
      
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      
      const isAdmin = req.user.userType === 'admin' || req.user.userType === 'super_admin';
      
      if (!isAdmin && ticket.customerId !== req.user.id) {
        return res.status(403).json({ error: "You can only view your own tickets" });
      }
      
      if (!isAdmin) {
        ticket.messages = ticket.messages.filter(m => !m.isInternal);
      }
      
      res.json(ticket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ error: "Failed to fetch ticket" });
    }
  });

  /**
   * @swagger
   * /tickets/{ticketId}/messages:
   *   post:
   *     tags: [Support Tickets - Customer]
   *     summary: Reply to a ticket
   *     description: Customer adds a reply message to their ticket
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: ticketId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [message]
   *             properties:
   *               message: { type: string, description: "Reply message content" }
   *     responses:
   *       201:
   *         description: Message added successfully
   *       400:
   *         description: Invalid request
   *       403:
   *         description: Cannot reply to closed ticket
   *       404:
   *         description: Ticket not found
   */
  app.post("/api/tickets/:ticketId/messages", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      
      const ticket = await storage.getTicketById(req.params.ticketId);
      
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      
      if (ticket.customerId !== req.user.id) {
        return res.status(403).json({ error: "You can only reply to your own tickets" });
      }
      
      if (ticket.status === 'closed') {
        return res.status(403).json({ error: "Cannot reply to a closed ticket" });
      }
      
      const newMessage = await storage.addTicketMessage({
        ticketId: req.params.ticketId,
        senderId: req.user.id,
        senderType: 'customer',
        message,
        isInternal: false,
      });
      
      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Error adding message:", error);
      res.status(500).json({ error: "Failed to add message" });
    }
  });

  // ===== ADMIN TICKET MANAGEMENT =====

  /**
   * @swagger
   * /admin/tickets:
   *   get:
   *     tags: [Support Tickets - Admin]
   *     summary: List all tickets
   *     description: Returns all support tickets with filtering options
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [open, in_progress, waiting_customer, resolved, closed] }
   *       - in: query
   *         name: priority
   *         schema: { type: string, enum: [low, medium, high, urgent] }
   *       - in: query
   *         name: assignedToId
   *         schema: { type: string, description: "Filter by assigned admin ID" }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *     responses:
   *       200:
   *         description: List of all tickets
   */
  app.get("/api/admin/tickets", requireAdmin, async (req, res) => {
    try {
      const { status, priority, assignedToId, page, limit } = req.query;
      
      const result = await storage.getAllTickets({
        status: status as string,
        priority: priority as string,
        assignedToId: assignedToId as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  /**
   * @swagger
   * /admin/tickets/{ticketId}:
   *   get:
   *     tags: [Support Tickets - Admin]
   *     summary: Get ticket details (admin view)
   *     description: Returns full ticket details including internal notes
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: ticketId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Ticket details with all messages
   *       404:
   *         description: Ticket not found
   */
  app.get("/api/admin/tickets/:ticketId", requireAdmin, async (req, res) => {
    try {
      const ticket = await storage.getTicketById(req.params.ticketId);
      
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      
      res.json(ticket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ error: "Failed to fetch ticket" });
    }
  });

  /**
   * @swagger
   * /admin/tickets/{ticketId}/assign:
   *   post:
   *     tags: [Support Tickets - Admin]
   *     summary: Assign ticket to admin
   *     description: Assigns a ticket to an admin user for handling
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: ticketId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               adminId: { type: string, description: "Admin ID to assign (defaults to current admin)" }
   *     responses:
   *       200:
   *         description: Ticket assigned successfully
   *       404:
   *         description: Ticket not found
   */
  app.post("/api/admin/tickets/:ticketId/assign", requireAdmin, async (req, res) => {
    try {
      const { adminId } = req.body;
      const assignToId = adminId || req.user!.id;
      
      const ticket = await storage.getTicketById(req.params.ticketId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      
      const updated = await storage.assignTicket(req.params.ticketId, assignToId);
      
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'ticket_assigned',
        targetType: 'ticket',
        targetId: req.params.ticketId,
        newValue: JSON.stringify({ assignedTo: assignToId }),
        ipAddress: getClientIp(req),
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error assigning ticket:", error);
      res.status(500).json({ error: "Failed to assign ticket" });
    }
  });

  /**
   * @swagger
   * /admin/tickets/{ticketId}/status:
   *   put:
   *     tags: [Support Tickets - Admin]
   *     summary: Update ticket status
   *     description: Updates the status of a ticket
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: ticketId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [status]
   *             properties:
   *               status: { type: string, enum: [open, in_progress, waiting_customer, resolved, closed] }
   *     responses:
   *       200:
   *         description: Status updated successfully
   *       400:
   *         description: Invalid status
   *       404:
   *         description: Ticket not found
   */
  app.put("/api/admin/tickets/:ticketId/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      
      const validStatuses = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const ticket = await storage.getTicketById(req.params.ticketId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      
      const previousStatus = ticket.status;
      const updated = await storage.updateTicketStatus(req.params.ticketId, status);
      
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'ticket_status_changed',
        targetType: 'ticket',
        targetId: req.params.ticketId,
        previousValue: previousStatus,
        newValue: status,
        ipAddress: getClientIp(req),
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating ticket status:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  /**
   * @swagger
   * /admin/tickets/{ticketId}/priority:
   *   put:
   *     tags: [Support Tickets - Admin]
   *     summary: Update ticket priority
   *     description: Updates the priority of a ticket
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: ticketId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [priority]
   *             properties:
   *               priority: { type: string, enum: [low, medium, high, urgent] }
   *     responses:
   *       200:
   *         description: Priority updated successfully
   *       400:
   *         description: Invalid priority
   *       404:
   *         description: Ticket not found
   */
  app.put("/api/admin/tickets/:ticketId/priority", requireAdmin, async (req, res) => {
    try {
      const { priority } = req.body;
      
      if (!priority) {
        return res.status(400).json({ error: "Priority is required" });
      }
      
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ error: "Invalid priority" });
      }
      
      const ticket = await storage.getTicketById(req.params.ticketId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      
      const previousPriority = ticket.priority;
      const updated = await storage.updateTicketPriority(req.params.ticketId, priority);
      
      await storage.createAdminActionLog({
        adminId: req.user!.id,
        actionType: 'ticket_priority_changed',
        targetType: 'ticket',
        targetId: req.params.ticketId,
        previousValue: previousPriority,
        newValue: priority,
        ipAddress: getClientIp(req),
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating ticket priority:", error);
      res.status(500).json({ error: "Failed to update priority" });
    }
  });

  /**
   * @swagger
   * /admin/tickets/{ticketId}/messages:
   *   post:
   *     tags: [Support Tickets - Admin]
   *     summary: Reply to ticket (admin)
   *     description: Admin adds a reply or internal note to a ticket
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: ticketId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [message]
   *             properties:
   *               message: { type: string, description: "Reply message content" }
   *               isInternal: { type: boolean, default: false, description: "If true, message is only visible to admins" }
   *     responses:
   *       201:
   *         description: Message added successfully
   *       400:
   *         description: Invalid request
   *       404:
   *         description: Ticket not found
   */
  app.post("/api/admin/tickets/:ticketId/messages", requireAdmin, async (req, res) => {
    try {
      const { message, isInternal } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      
      const ticket = await storage.getTicketById(req.params.ticketId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      
      const newMessage = await storage.addTicketMessage({
        ticketId: req.params.ticketId,
        senderId: req.user!.id,
        senderType: 'admin',
        message,
        isInternal: isInternal || false,
      });
      
      if (!isInternal && ticket.status !== 'waiting_customer') {
        await storage.updateTicketStatus(req.params.ticketId, 'waiting_customer');
      }
      
      res.status(201).json(newMessage);
    } catch (error) {
      console.error("Error adding message:", error);
      res.status(500).json({ error: "Failed to add message" });
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
      
      const vendors = [...new Set(products.map(p => p.make).filter(Boolean))];
      // Note: getting unique category IDs
      const categoryIds = [...new Set(products.map(p => p.categoryId).filter(Boolean))];

      res.json({
        brands: vendors,
        categoryIds,
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
