import { BaseController } from './BaseController';
import { QueryTypes } from 'sequelize';
import { User } from '../models/User';
import { UserProfile } from '../models/UserProfile'; // Import UserProfile
import { AuthSession } from '../models/AuthSession';
import { sequelize } from '../models';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { type NextRequest } from 'next/server';
import { PermissionService } from '../services/PermissionService';
import { TwilioService } from '../services/TwilioService';
import { EmailService } from '../services/EmailService';

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'armoredmart-jwt-secret-key-2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'armoredmart-refresh-secret-key-2024';

// Token Expiry Configuration (configurable via env)
const ACCESS_TOKEN_EXPIRY_HOURS = parseInt(process.env.ACCESS_TOKEN_EXPIRY_HOURS || '2', 10);
const REFRESH_TOKEN_EXPIRY_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '7', 10);
const ACCESS_TOKEN_EXPIRY = `${ACCESS_TOKEN_EXPIRY_HOURS}h`;
const ACCESS_TOKEN_EXPIRY_SECONDS = ACCESS_TOKEN_EXPIRY_HOURS * 60 * 60;

export class AuthController extends BaseController {
  
  // Register User
  async userExists(req: NextRequest) {
      try {
        const body = await req.json();
        // Accept either 'identifier' or 'email' for backwards compatibility
        let identifier = body.identifier || body.email;
              
        // Normalize
        if (identifier) identifier = String(identifier).trim();
  
        if (!identifier) {
          return this.sendError('Email or Phone number is required', 400);
        }
  
        // Determine type
        const isEmail = identifier.includes('@');
        
        // Find user
        const whereClause = isEmail ? { email: identifier, is_active: true, suspended_at: null } : { phone: identifier, is_active: true, suspended_at: null };
        const user = await User.findOne({ where: whereClause });
  
        if (!user) {
          return this.sendError('No account found with this identifier', 404);
        }
  
        return this.sendSuccess({
          identifier_type: isEmail ? 'email' : 'phone',
          identifier: isEmail ? user.email : `${user.country_code}${user.phone}`,
          userType: user.user_type
        }, 'User exists', 200);
  
      } catch (error: any) {
        console.error('User Exists Error:', error);
        return this.sendError('Failed to check user details', 500, [error.message]);
      }
  }

  // Verify Firebase Auth Token & Login/Register
  async verifyFirebaseAuth(req: NextRequest) {
    try {
        const body = await req.json();
        const { idToken } = body;

        if (!idToken) {
            return this.sendError('ID Token is required', 400);
        }

        // 1. Verify Token with Firebase Admin
        // Dynamic import to avoid circular dep or init issues if not already loaded
        const { firebaseAdmin } = await import('../config/firebase');
        
        let decodedToken;
        try {
            decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
        } catch (e: any) {
            console.error('Firebase Token Verification Failed:', e);
            return this.sendError('Invalid or expired token', 401, [e.message]);
        }

        const { uid, email, phone_number, email_verified } = decodedToken;
        const identifier = email || phone_number;

        if (!uid || uid.length > 128) {
             console.error('[AUTH ERROR] Decoded UID is invalid or too long (resembles token?)', uid);
             return this.sendError('Security Error: Invalid UID from token', 400);
        }

        if (!identifier) {
            return this.sendError('Token does not contain email or phone', 400);
        }

        // 2. Find User in DB
        // Search by Firebase UID first (strongest link)
        let user = await User.findOne({ 
            where: { firebase_uid: uid },
            include: [{ model: UserProfile, as: 'profile' }] 
        });

        // 3. Fallback: Search by Email or Phone if not linked yet
        if (!user) {
             if (email) {
                 user = await User.findOne({ 
                     where: { email: email },
                     include: [{ model: UserProfile, as: 'profile' }]
                 });
             } else if (phone_number) {
                 // Firebase phone usually comes as +CountryCodeNumber (e.g. +97150...)
                 // Our DB stores phone without dial code mostly, OR we need to be careful.
                 // For now, let's try exact match on phone column assuming we store E.164, OR try to match roughly.
                 // Ideally we should standardise our DB phone to E.164
                 user = await User.findOne({ 
                    where: { phone: phone_number.replace('+', '') }, // Naive strip
                    include: [{ model: UserProfile, as: 'profile' }]
                 });
             }

             // If found by email/phone but no UID, link them!
             if (user) {
                 user.firebase_uid = uid;
                 // Update verified status if Firebase claims it's verified
                 if (email_verified) user.email_verified = true;
                 if (phone_number) user.phone_verified = true; // SMS auth implies verification
                 await user.save();
             }
        }

        // 4. If User Found -> LOGIN
        if (user) {
             if (!user.is_active || user.suspended_at) {
                 return this.sendError('Account is inactive or suspended', 403);
             }

             // Generate Session & Tokens (Similar to normal login)
             const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
             const userAgent = req.headers.get('user-agent') || 'unknown';
             const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
             const deviceLabel = this.parseUserAgent(userAgent);
       
             const now = new Date();
             const [results]: any = await sequelize.query(
               `INSERT INTO auth_sessions (user_id, refresh_token_hash, user_agent, ip_address, device_label, expires_at, last_used_at, created_at)
                VALUES (:uid, 'temp', :ua, :ip, :dev, :exp, :now, :now)
                RETURNING id`,
               {
                 replacements: { uid: user.id, ua: userAgent, ip: ipAddress, dev: deviceLabel, exp: expiresAt, now },
                 type: QueryTypes.INSERT,
               }
             );
             const sessionId = results[0]?.id;
             const tokens = this.generateTokens(user, sessionId || '');
             const refreshTokenHash = this.hashToken(tokens.refreshToken);
             
             await sequelize.query(
               `UPDATE auth_sessions SET refresh_token_hash = :hash WHERE id = :id`,
               {
                 replacements: { hash: refreshTokenHash, id: sessionId },
                 type: QueryTypes.UPDATE
               }
             );

            // Fetch Permissions
            const permissionService = new PermissionService();
            const permissions = await permissionService.getUserPermissionNames(user.id);

            console.log(`[AUTH] Firebase Login Success for User: ${user.email}`);

            return this.sendSuccess({
                user: {
                  ...user.toJSON() as any,
                  email_verified: user.email_verified,
                  phone_verified: user.phone_verified,
                  country_code: user.country_code,
                  userType: user.user_type, 
                  onboardingStep: user.onboarding_step,
                  permissions: permissions,
              },
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
            }, "Login Success", 200);
        }

        // 5. If User Not Found -> Return 202 (Accepted) or 404 with details to proceed to Registration
        // For security, usually 404 is okay if we are strictly "Login". 
        // But for "Onboarding", we might want to return the verified details so the frontend can pre-fill.
        return this.sendError('User not found. Please register.', 404, [], {
            firebaseUid: uid,
            email: email,
            phone: phone_number,
            emailVerified: email_verified
        });

    } catch (error: any) {
        console.error('Firebase Verify Error:', error);
        return this.sendError('Internal Auth Error', 500, [error.message]);
    }
  }

  async registerWithFirebase(req: NextRequest) {
      try {
          const body = await req.json();
          const { idToken, name, username, userType } = body;
          // Frontend now sends clean split keys
          const { phone: inputPhone, countryCode: inputCountryCode } = body;

          // 1. Basic Validation
          if (!idToken || !name || !username) {
              return this.sendError('ID Token, Name, and Username are required', 400);
          }

          // 2. Verify Token
          const { firebaseAdmin } = await import('../config/firebase');
          let decodedToken;
          try {
              decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
          } catch (e: any) {
              return this.sendError('Invalid or expired token', 401, [e.message]);
          }

          const { uid, email, phone_number, email_verified } = decodedToken;

          console.log(`[AUTH DEBUG] registerWithFirebase: UID=${uid}, Email=${email}, Phone=${phone_number}`);
          
          if (!uid || uid.length > 128) {
              console.error('[AUTH ERROR] Decoded UID is invalid or too long (resembles token?)', uid);
              return this.sendError('Security Error: Invalid UID from token', 400);
          }

          if (!email || !phone_number) {
            // Ideally should have both
          }

          // 3. Check Duplicates in DB
          const existingUser = await User.findOne({
               where: sequelize.or(
                   { firebase_uid: uid },
                   { email: email },
                   { username: username }
               )
          });
          
          if (existingUser) {
              return this.sendError('User already exists. Please login.', 400);
          }

          // 4. Create User
          // Use input phone/countryCode if available (clean format), otherwise fallback to parsing token (naive)
          let finalPhone = inputPhone;
          let finalCountryCode = inputCountryCode;

          if (!finalPhone && phone_number) {
             finalPhone = phone_number.replace('+', ''); 
          }
           if (!finalCountryCode && phone_number) {
             finalCountryCode = '+971'; // Fallback default or naive extract?
          }

          const userId = crypto.randomUUID();
          const user = await User.create({
            id: userId,
            name: name,
            username: username,
            email: email || '', 
            phone: finalPhone, 
            country_code: finalCountryCode || '+971',
            firebase_uid: uid,
            password: undefined, // No password for firebase users 
            user_type: (userType || 'customer') as 'customer' | 'vendor',
            email_verified: email_verified || false,
            phone_verified: !!phone_number,
            is_active: true,
            onboarding_step: 0,
          });

          // Create User Profile
          await UserProfile.create({
            user_id: user.id,
            onboarding_status: 'not_started',
            current_step: 0,
          });

          // 5. Generate Session
             const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
             const userAgent = req.headers.get('user-agent') || 'unknown';
             const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
             const deviceLabel = this.parseUserAgent(userAgent);
       
             const now = new Date();
             const [results]: any = await sequelize.query(
               `INSERT INTO auth_sessions (user_id, refresh_token_hash, user_agent, ip_address, device_label, expires_at, last_used_at, created_at)
                VALUES (:uid, 'temp', :ua, :ip, :dev, :exp, :now, :now)
                RETURNING id`,
               {
                 replacements: { uid: user.id, ua: userAgent, ip: ipAddress, dev: deviceLabel, exp: expiresAt, now },
                 type: QueryTypes.INSERT,
               }
             );
             const sessionId = results[0]?.id;
             const tokens = this.generateTokens(user, sessionId || '');
             const refreshTokenHash = this.hashToken(tokens.refreshToken);
             
             await sequelize.query(
               `UPDATE auth_sessions SET refresh_token_hash = :hash WHERE id = :id`,
               {
                 replacements: { hash: refreshTokenHash, id: sessionId },
                 type: QueryTypes.UPDATE
               }
             );

             // Fetch Permissions
             const permissionService = new PermissionService();
             const permissions = await permissionService.getUserPermissionNames(user.id);

          return this.sendSuccess({
            user: { 
                ...user.toJSON(), 
                userType: user.user_type,
                email_verified: user.email_verified,
                phone_verified: user.phone_verified,
                country_code: user.country_code,
                onboardingStep: user.onboarding_step,
                permissions: permissions
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
          }, 'Registration successful', 201);

      } catch (error: any) {
          console.error('Firebase Register Error:', error);
          // Handle specific errors
          return this.sendError('Registration failed', 500, [error.message]);
      }
  }

  
  // Register User
  async register(req: NextRequest) {
    // Transaction removed for debugging
    try {
      const body = await req.json();
      
      // Basic Validation
      if (!body.email || !body.password || !body.name) {
        return this.sendError('Email, password, and name are required', 400);
      }

      // Check existing
      const existingUser = await User.findOne({ where: { email: body.email } });
      if (existingUser) {
        return this.sendError('Email already registered', 400);
      }

      // Hash Password
      const hashedPassword = await bcrypt.hash(body.password, 10);

      // Create User
      const userId = crypto.randomUUID();
      const user = await User.create({
        id: userId,
        name: body.name,
        email: body.email,
        password: hashedPassword,
        user_type: (body.userType || 'customer') as 'customer' | 'vendor',
        email_verified: false,
        is_active: true,
      });
      
      // Create User Profile
      await UserProfile.create({
        user_id: user.id,
        onboarding_status: 'not_started',
        current_step: 0,
      });

      // Create Session
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      const userAgent = req.headers.get('user-agent') || 'unknown';
      const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
      const deviceLabel = this.parseUserAgent(userAgent);

      const now = new Date();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [results]: any = await sequelize.query(
        `INSERT INTO auth_sessions (user_id, refresh_token_hash, user_agent, ip_address, device_label, expires_at, last_used_at, created_at)
         VALUES (:uid, 'temp', :ua, :ip, :dev, :exp, :now, :now)
         RETURNING id`,
        {
          replacements: {
            uid: userId, 
            ua: userAgent, 
            ip: ipAddress, 
            dev: deviceLabel, 
            exp: expiresAt,
            now: now
          },
          type: QueryTypes.INSERT
        }
      );
      const sessionId = results[0]?.id;

      // Generate Tokens
      const tokens: { accessToken: string; refreshToken: string } = this.generateTokens(user, sessionId || '');
      
      // Hash Refresh Token
      const refreshTokenHash = this.hashToken(tokens.refreshToken);
      await sequelize.query(
        `UPDATE auth_sessions SET refresh_token_hash = :hash WHERE id = :id`,
        {
          replacements: { hash: refreshTokenHash, id: sessionId },
          type: QueryTypes.UPDATE
        }
      );

      // await transaction.commit(); // Removed
      
      console.log(`[CHECKOUT DEBUG] AUTH API (Register): Generated Token ${(tokens.accessToken as string).substring(0, 20)}... for User ${user.id}`);

      return this.sendSuccess({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          userType: user.user_type,
          onboardingStep: user.onboarding_step,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      }, 'User registered successfully', 201);

    } catch (error: any) {
      // await transaction.rollback(); // Removed
      console.error('Registration Error:', error);
      return this.sendError('Registration failed', 500, [error.message]);
    }
  }

  // Login User
  async login(req: NextRequest) {
    try {
      const body = await req.json();
      if (!body.email || !body.password) {
        return this.sendError('Email and password required', 400);
      }

      // Include UserProfile in login query
      const user = await User.findOne({ 
          where: { email: body.email },
          include: [{ model: UserProfile, as: 'profile' }] 
      });

      if (!user || !user.password) {
        return this.sendError('Invalid credentials', 401);
      }

      const isValid = await bcrypt.compare(body.password, user.password);
      if (!isValid) {
        return this.sendError('Invalid credentials', 401);
      }

      // Create Session
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      const userAgent = req.headers.get('user-agent') || 'unknown';
      const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
      const deviceLabel = this.parseUserAgent(userAgent);

      const now = new Date();
      const [results]: any = await sequelize.query(
        `INSERT INTO auth_sessions (user_id, refresh_token_hash, user_agent, ip_address, device_label, expires_at, last_used_at, created_at)
         VALUES (:uid, 'temp', :ua, :ip, :dev, :exp, :now, :now)
         RETURNING id`,
        {
          replacements: {
            uid: user.id, 
            ua: userAgent, 
            ip: ipAddress, 
            dev: deviceLabel, 
            exp: expiresAt,
            now: now
          },
          type: QueryTypes.INSERT,
        }
      );
      const sessionId = results[0]?.id;

      const tokens: { accessToken: string; refreshToken: string } = this.generateTokens(user, sessionId || '');
      const refreshTokenHash = this.hashToken(tokens.refreshToken);
      await sequelize.query(
        `UPDATE auth_sessions SET refresh_token_hash = :hash WHERE id = :id`,
        {
          replacements: { hash: refreshTokenHash, id: sessionId },
          type: QueryTypes.UPDATE
        }
      );

      console.log(`[CHECKOUT DEBUG] AUTH API (Login): Generated Token ${(tokens.accessToken as string).substring(0, 20)}... for User ${user.id}`);

      // Fetch user permissions
      const permissionService = new PermissionService();
      const permissions = await permissionService.getUserPermissionNames(user.id);

      // Build final user object
      // We keep the profile nested to match frontend User interface and allow existence checks
      const userJson = user.toJSON() as any;
      
      const responseUser = {
          ...userJson,
          userType: user.user_type, 
          onboardingStep: user.onboarding_step,
          permissions: permissions,
          // profile is already in userJson as 'profile' from the include query
      };

      return this.sendSuccess({
        user: responseUser,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Login Error:', error);
      return this.sendError('Login failed', 500, [error.message]);
    }
  }

  // Logout User
  async logout(req: NextRequest) {
    try {
      const body = await req.json();
      const { refreshToken } = body;

      if (refreshToken) {
        // Find session by refresh token hash
        const hash = this.hashToken(refreshToken);
        const session = await AuthSession.findOne({ where: { refresh_token_hash: hash } });
        
        if (session) {
           await session.destroy();
        }
      }

      return this.sendSuccess({}, 'Logged out successfully');

    } catch (error: any) {
      console.error('Logout Error:', error);
      // Even if it fails, we want the client to think it succeeded so they clear tokens
      return this.sendSuccess({}, 'Logged out');
    }
  }

  // Refresh Token
  async refresh(req: NextRequest) {
    try {
      const body = await req.json();
      const { refreshToken } = body;

      if (!refreshToken) {
        return this.sendError('Refresh token required', 400);
      }

      // Verify Token
      let decoded: any;
      try {
        decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      } catch (_) {
        return this.sendError('Invalid refresh token', 401);
      }

      // Check Session in DB
      const session = await AuthSession.findByPk(decoded.sessionId);
      if (!session) {
        return this.sendError('Session expired', 401);
      }

      // Verify Hash
      const hash = this.hashToken(refreshToken);
      if (session.refresh_token_hash !== hash) {
        // Potential reuse attack! Delete session
        await session.destroy();
        return this.sendError('Invalid refresh token detected', 401);
      }

      // Find user to ensure they still exist/active
      const user = await User.findByPk(decoded.sub);
      if (!user || !user.is_active) {
         return this.sendError('User not found or inactive', 401);
      }
      
      // Token Version Check
      if (user.token_version !== decoded.tokenVersion) {
        return this.sendError('Token revoked', 401);
      }

      // Generate New Tokens
      // NOTE: We do NOT rotate the refresh token here to prevent race conditions 
      // with multiple tabs/requests (Reuse Detection killing the session).
      // We generate a new access token, but reuse the existing refresh token.
      const tokens = this.generateTokens(user, session.id);
      
      // Update Session
      session.last_used_at = new Date();
      await session.save();

      return this.sendSuccess({
        accessToken: tokens.accessToken,
        refreshToken: refreshToken, // Return the SAME refresh token
        expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Refresh Token Error:', error);
      return this.sendError('Refresh failed', 500, [error.message]);
    }
  }

  // Helper: Generate Tokens
  private generateTokens(user: User, sessionId: string): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        userType: user.user_type,
        sessionId,
        tokenVersion: user.token_version,
        type: 'access',
      },
      JWT_SECRET as string,
      { expiresIn: ACCESS_TOKEN_EXPIRY as any }
    ) as string;

    const refreshToken = jwt.sign(
      {
        sub: user.id,
        sessionId,
        tokenVersion: user.token_version,
        type: 'refresh',
      },
      JWT_REFRESH_SECRET as string,
      { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` as any }
    ) as string;

    return { accessToken, refreshToken };
  }

  // Helper: Hash Token
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Helper: Parse User Agent (Simplified)
  private parseUserAgent(userAgent: string): string {
    let device = 'Unknown';
    if (userAgent.includes('iPhone')) device = 'iPhone';
    else if (userAgent.includes('iPad')) device = 'iPad';
    else if (userAgent.includes('Android')) device = 'Android';
    else if (userAgent.includes('Windows')) device = 'Windows';
    else if (userAgent.includes('Mac')) device = 'Mac';
    else if (userAgent.includes('Linux')) device = 'Linux';
    return device;
  }
}
