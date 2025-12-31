// Integration: blueprint:javascript_database
import { 
  users, products, categories, reviews, cartItems, orders, orderItems, authSessions,
  refunds, refundItems, addresses, savedPaymentMethods, orderStatusHistory, otpVerifications, userProfiles,
  adminActionLogs, productMedia, productPricingTiers, productReviewNotes, platformSettings,
  supportTickets, ticketMessages, ticketAttachments, vendorNotifications,
  refNatureOfBusiness, refEndUseMarkets, refLicenseTypes, refCountries,
  refVendorCategories, refCurrencies, refPaymentMethods, refFinancialInstitutions, refProofTypes, refVerificationMethods,
  refProductSizes, refProductColors, refProductFeatures, refProductPerformance, 
  refProductThickness, refProductMaterials, refDriveTypes, refDimensionUnits, 
  refWeightUnits, refControlledItemTypes, refPricingTerms, refManufacturingSources,
  type User, type InsertUser,
  type Product, type InsertProduct,
  type Category, type InsertCategory,
  type Review, type InsertReview,
  type CartItem, type InsertCartItem,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type AuthSession, type InsertAuthSession,
  type Refund, type InsertRefund,
  type RefundItem, type InsertRefundItem,
  type Address, type InsertAddress,
  type SavedPaymentMethod, type InsertSavedPaymentMethod,
  type OrderStatusHistory, type InsertOrderStatusHistory,
  type OtpVerification, type InsertOtpVerification,
  type UserProfile, type InsertUserProfile,
  type AdminActionLog, type InsertAdminActionLog,
  type ProductMedia, type InsertProductMedia,
  type ProductPricingTier, type InsertProductPricingTier,
  type ProductReviewNote, type InsertProductReviewNote,
  type PlatformSetting,
  type SupportTicket, type InsertSupportTicket,
  type TicketMessage, type InsertTicketMessage,
  type TicketAttachment, type InsertTicketAttachment,
  type VendorNotification, type InsertVendorNotification
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, or, ilike, isNull, inArray, count, gte, lte, asc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: string, data: { name?: string; email?: string }): Promise<User | undefined>;
  updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategoriesByLevel(level: number): Promise<Category[]>;
  getCategoriesByParentId(parentId: number): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  getCategoryLevel(categoryId: number): Promise<number>;
  getCategoryHierarchy(categoryId: number): Promise<Category[]>;
  searchCategoriesByName(name: string, parentId?: number): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  categoryHasProducts(categoryId: number): Promise<boolean>;

  // Products
  getProducts(filters?: {
    categoryId?: number;
    vendorId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<Product[]>;
  getProductById(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  createProductsBulk(products: InsertProduct[]): Promise<Product[]>;
  
  // Reviews
  getReviewsByProductId(productId: number): Promise<(Review & { user: User })[]>;
  createReview(review: InsertReview): Promise<Review>;

  // Cart
  getCartByUserId(userId: string): Promise<(CartItem & { product: Product })[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: number): Promise<void>;
  clearCart(userId: string): Promise<void>;

  // Orders
  getOrdersByUserId(userId: string): Promise<(Order & { items: OrderItem[] })[]>;
  getOrderById(id: string): Promise<(Order & { items: OrderItem[] }) | undefined>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;

  // Vendor Stats & Operations
  getVendorStats(vendorId: string): Promise<{
    revenue: number;
    orders: number;
    products: number;
  }>;
  getVendorOrders(vendorId: string): Promise<(Order & { items: OrderItem[]; customer: User })[]>;
  getVendorCustomers(vendorId: string): Promise<(User & { orderCount: number; totalSpent: number })[]>;
  updateOrderStatus(orderId: string, status: string, changedBy: string, note?: string): Promise<Order | undefined>;
  getOrderStatusHistory(orderId: string): Promise<OrderStatusHistory[]>;
  deleteProduct(id: number, vendorId: string): Promise<boolean>;
  getVendorAnalytics(vendorId: string): Promise<{
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    totalCustomers: number;
    revenueByMonth: { month: string; revenue: number }[];
    topProducts: { id: number; name: string; revenue: number; quantity: number }[];
    ordersByStatus: { status: string; count: number }[];
    recentOrders: (Order & { items: OrderItem[] })[];
  }>;

  // Auth Sessions
  createSession(session: InsertAuthSession): Promise<AuthSession>;
  getSessionById(id: string): Promise<AuthSession | undefined>;
  getActiveSessionsByUserId(userId: string): Promise<AuthSession[]>;
  updateSessionLastUsed(id: string): Promise<void>;
  revokeSession(id: string): Promise<void>;
  revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void>;
  updateUserTokenVersion(userId: string): Promise<number>;

  // Refunds
  getRefundsByUserId(userId: string): Promise<(Refund & { items: RefundItem[] })[]>;
  getRefundById(id: string): Promise<(Refund & { items: RefundItem[] }) | undefined>;
  createRefund(refund: InsertRefund, items: InsertRefundItem[]): Promise<Refund>;

  // Addresses
  getAddressesByUserId(userId: string): Promise<Address[]>;
  getAddressById(id: number): Promise<Address | undefined>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: number, address: Partial<InsertAddress>): Promise<Address | undefined>;
  deleteAddress(id: number): Promise<void>;
  setDefaultAddress(userId: string, addressId: number): Promise<void>;

  // Saved Payment Methods
  getSavedPaymentsByUserId(userId: string): Promise<SavedPaymentMethod[]>;
  getSavedPaymentById(id: number): Promise<SavedPaymentMethod | undefined>;
  createSavedPayment(payment: InsertSavedPaymentMethod): Promise<SavedPaymentMethod>;
  updateSavedPayment(id: number, payment: Partial<InsertSavedPaymentMethod>): Promise<SavedPaymentMethod | undefined>;
  deleteSavedPayment(id: number): Promise<void>;
  setDefaultPayment(userId: string, paymentId: number): Promise<void>;

  // OTP Verification
  createOtpVerification(otp: InsertOtpVerification): Promise<OtpVerification>;
  getOtpVerification(identifier: string, type: 'email' | 'phone', purpose: string): Promise<OtpVerification | undefined>;
  incrementOtpAttempts(id: number): Promise<void>;
  markOtpVerified(id: number): Promise<void>;
  deleteExpiredOtps(): Promise<void>;
  deleteOtpById(id: number): Promise<void>;

  // User OTP-related
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByFirebaseUid(uid: string): Promise<User | undefined>;
  updateUserVerificationStatus(userId: string, field: 'emailVerified' | 'phoneVerified', value: boolean): Promise<User | undefined>;
  updateUserPhone(userId: string, phone: string, countryCode: string): Promise<User | undefined>;
  updateUserOnboardingStep(userId: string, step: number): Promise<User | undefined>;
  
  // User Profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;
  updateUserFirebaseUid(userId: string, firebaseUid: string): Promise<User | undefined>;
  
  // Reference Data
  getReferenceData(type: 'nature_of_business' | 'end_use_markets' | 'license_types' | 'countries' | 'vendorCategories' | 'currencies' | 'paymentMethods' | 'financialInstitutions' | 'proofTypes' | 'verificationMethods'): Promise<any[]>;

  // ===== ADMIN OPERATIONS =====
  
  // Admin Dashboard Stats
  getAdminDashboardStats(): Promise<{
    totalSellers: number;
    activeSellers: number;
    pendingApprovals: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
    totalRefunds: number;
  }>;
  
  // Seller Management
  getAllSellers(filters?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    sellers: (User & { userProfile?: UserProfile; stats?: { products: number; orders: number; revenue: number } })[];
    total: number;
    page: number;
    limit: number;
  }>;
  
  getSellerDetails(sellerId: string): Promise<(User & { 
    userProfile?: UserProfile; 
    stats: { products: number; orders: number; revenue: number; customers: number };
    recentOrders: Order[];
  }) | undefined>;
  
  updateSellerStatus(
    sellerId: string, 
    status: 'approved' | 'rejected' | 'pending_verification' | 'under_review',
    adminId: string,
    note?: string,
    rejectionReason?: string
  ): Promise<UserProfile | undefined>;
  
  suspendUser(userId: string, adminId: string, reason: string): Promise<User | undefined>;
  activateUser(userId: string, adminId: string): Promise<User | undefined>;
  
  // Admin Action Logs
  createAdminActionLog(log: InsertAdminActionLog): Promise<AdminActionLog>;
  getAdminActionLogs(filters?: {
    adminId?: string;
    actionType?: string;
    targetType?: string;
    targetId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ logs: (AdminActionLog & { admin: User })[]; total: number }>;
  
  // Admin Users
  getAllAdmins(): Promise<User[]>;
  createAdmin(user: InsertUser): Promise<User>;
  
  // ===== SUPPORT TICKETS =====
  
  // Customer Ticket Operations
  createTicket(ticket: InsertSupportTicket, initialMessage: string): Promise<SupportTicket>;
  getCustomerTickets(customerId: string, filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ tickets: (SupportTicket & { order: Order; messagesCount: number })[]; total: number }>;
  getTicketById(ticketId: string): Promise<(SupportTicket & { 
    order: Order; 
    customer: User;
    assignedTo?: User;
    messages: (TicketMessage & { sender: User; attachments: TicketAttachment[] })[];
  }) | undefined>;
  addTicketMessage(message: InsertTicketMessage): Promise<TicketMessage>;
  addTicketAttachment(attachment: InsertTicketAttachment): Promise<TicketAttachment>;
  
  // Admin Ticket Operations
  getAllTickets(filters?: {
    status?: string;
    priority?: string;
    assignedToId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ tickets: (SupportTicket & { order: Order; customer: User; assignedTo?: User; messagesCount: number })[]; total: number }>;
  assignTicket(ticketId: string, adminId: string): Promise<SupportTicket | undefined>;
  updateTicketStatus(ticketId: string, status: string): Promise<SupportTicket | undefined>;
  updateTicketPriority(ticketId: string, priority: string): Promise<SupportTicket | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserProfile(id: string, data: { name?: string; email?: string }): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        name: data.name,
        email: data.email
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategoriesByLevel(level: number): Promise<Category[]> {
    // Level 0: Main categories (no parent)
    // Level 1: Categories (parent is main category)
    // Level 2: Subcategories (parent is category)
    if (level === 0) {
      return await db.select().from(categories).where(isNull(categories.parentId));
    }
    
    // For level 1 and 2, we need to find categories whose parent is at the previous level
    const parentCategories = await this.getCategoriesByLevel(level - 1);
    const parentIds = parentCategories.map(cat => cat.id);
    
    if (parentIds.length === 0) {
      return [];
    }
    
    return await db.select().from(categories).where(inArray(categories.parentId, parentIds));
  }

  async getCategoriesByParentId(parentId: number): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.parentId, parentId));
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async getCategoryLevel(categoryId: number): Promise<number> {
    const category = await this.getCategoryById(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }
    
    if (category.parentId === null) {
      return 0; // Main category
    }
    
    // Recursively get parent's level
    const parentLevel = await this.getCategoryLevel(category.parentId);
    return parentLevel + 1;
  }

  async getCategoryHierarchy(categoryId: number): Promise<Category[]> {
    const hierarchy: Category[] = [];
    let currentId: number | null = categoryId;
    
    while (currentId !== null) {
      const category = await this.getCategoryById(currentId);
      if (!category) break;
      
      hierarchy.unshift(category); // Add to beginning to get root-to-leaf order
      currentId = category.parentId;
    }
    
    return hierarchy;
  }

  async searchCategoriesByName(name: string, parentId?: number): Promise<Category[]> {
    if (parentId !== undefined) {
      return await db
        .select()
        .from(categories)
        .where(
          and(
            ilike(categories.name, `%${name}%`),
            eq(categories.parentId, parentId)
          )
        );
    }
    
    return await db
      .select()
      .from(categories)
      .where(ilike(categories.name, `%${name}%`));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category as any).returning();
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category> {
    const [updated] = await db
      .update(categories)
      .set(category as any)
      .where(eq(categories.id, id))
      .returning();
    return updated;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async categoryHasProducts(categoryId: number): Promise<boolean> {
    const result = await db
      .select({ count: count() })
      .from(products)
      .where(
        or(
          eq(products.mainCategoryId, categoryId),
          eq(products.categoryId, categoryId),
          eq(products.subCategoryId, categoryId)
        )
      );
    
    return result[0].count > 0;
  }

  async validateCategoryIds(categoryIds: number[]): Promise<number[]> {
    const existingCategories = await db
      .select({ id: categories.id })
      .from(categories)
      .where(inArray(categories.id, categoryIds));
    
    return existingCategories.map(cat => cat.id);
  }

  // Products
  async getProducts(filters?: {
    categoryId?: number;
    vendorId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<Product[]> {
    let query = db.select().from(products);

    const conditions = [];
    
    if (filters?.categoryId) {
      conditions.push(eq(products.categoryId, filters.categoryId));
    }
    if (filters?.vendorId) {
      conditions.push(eq(products.vendorId, filters.vendorId));
    }
    if (filters?.search) {
      conditions.push(
        or(
          ilike(products.name, `%${filters.search}%`),
          ilike(products.description, `%${filters.search}%`)
        )
      );
    }
    if (filters?.minPrice !== undefined) {
      conditions.push(sql`${products.price}::numeric >= ${filters.minPrice}`);
    }
    if (filters?.maxPrice !== undefined) {
      conditions.push(sql`${products.price}::numeric <= ${filters.maxPrice}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query;
  }

  async getProductById(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product as any).returning();
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db
      .update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    return updated || undefined;
  }

  async createProductsBulk(items: InsertProduct[]): Promise<Product[]> {
    if (!items || items.length === 0) return [];
    const inserted = await db.insert(products).values(items as any).returning();
    return inserted;
  }

  // Reviews
  async getReviewsByProductId(productId: number): Promise<(Review & { user: User })[]> {
    const result = await db
      .select()
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.productId, productId))
      .orderBy(desc(reviews.createdAt));

    return result.map(row => ({
      ...row.reviews,
      user: row.users,
    }));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review as any).returning();
    
    // Update product rating and review count
    const productReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.productId, newReview.productId));
    
    const avgRating = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
    
    await db
      .update(products)
      .set({
        rating: avgRating.toFixed(1),
        reviewCount: productReviews.length,
      })
      .where(eq(products.id, newReview.productId));

    return newReview;
  }

  // Cart
  async getCartByUserId(userId: string): Promise<(CartItem & { product: Product })[]> {
    const result = await db
      .select()
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.userId, userId));

    return result.map(row => ({
      ...row.cart_items,
      product: row.products,
    }));
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    // Check if item already exists in cart
    const [existing] = await db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.userId, item.userId!),
          eq(cartItems.productId, item.productId!)
        )
      );

    if (existing) {
      // Update quantity
      const [updated] = await db
        .update(cartItems)
        .set({ quantity: existing.quantity + (item.quantity || 1) })
        .where(eq(cartItems.id, existing.id))
        .returning();
      return updated;
    }

    const [newItem] = await db.insert(cartItems).values(item as any).returning();
    return newItem;
  }

  async updateCartItem(id: number, quantity: number): Promise<CartItem | undefined> {
    const [updated] = await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, id))
      .returning();
    return updated || undefined;
  }

  async removeFromCart(id: number): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.id, id));
  }

  async clearCart(userId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }

  // Orders
  async getOrdersByUserId(userId: string): Promise<(Order & { items: OrderItem[] })[]> {
    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    const ordersWithItems = await Promise.all(
      userOrders.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        
        return {
          ...order,
          items,
        };
      })
    );

    return ordersWithItems;
  }

  async getOrderById(id: string): Promise<(Order & { items: OrderItem[] }) | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));

    return {
      ...order,
      items,
    };
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order as any).returning();
    
    if (items.length > 0) {
      await db.insert(orderItems).values(
        items.map(item => ({
          ...item,
          orderId: newOrder.id,
        })) as any
      );
    }

    return newOrder;
  }

  // Vendor Stats
  async getVendorStats(vendorId: string): Promise<{
    revenue: number;
    orders: number;
    products: number;
  }> {
    // Get product count
    const vendorProducts = await db
      .select()
      .from(products)
      .where(eq(products.vendorId, vendorId));

    // Get orders containing vendor products
    const productIds = vendorProducts.map(p => p.id);
    
    const vendorOrderItems = await db
      .select()
      .from(orderItems)
      .where(sql`${orderItems.productId} = ANY(${productIds})`);

    const revenue = vendorOrderItems.reduce((sum, item) => {
      return sum + parseFloat(item.price.toString()) * item.quantity;
    }, 0);

    const uniqueOrders = new Set(vendorOrderItems.map(item => item.orderId));

    return {
      revenue,
      orders: uniqueOrders.size,
      products: vendorProducts.length,
    };
  }

  // Get orders for a vendor (orders containing their products)
  async getVendorOrders(vendorId: string): Promise<(Order & { items: OrderItem[]; customer: User })[]> {
    // Get vendor's products
    const vendorProducts = await db
      .select()
      .from(products)
      .where(eq(products.vendorId, vendorId));
    
    const productIds = vendorProducts.map(p => p.id);
    if (productIds.length === 0) return [];

    // Get order items for vendor's products
    const vendorOrderItems = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.productId, productIds));

    const uniqueOrderIds = [...new Set(vendorOrderItems.map(item => item.orderId))];
    if (uniqueOrderIds.length === 0) return [];

    // Get full orders with items and customer info
    const ordersWithDetails = await Promise.all(
      uniqueOrderIds.map(async (orderId) => {
        const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
        if (!order) return null;

        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
        const [customer] = await db.select().from(users).where(eq(users.id, order.userId));

        return {
          ...order,
          items: items.filter(item => productIds.includes(item.productId)),
          customer: customer!,
        };
      })
    );

    return ordersWithDetails.filter(Boolean) as (Order & { items: OrderItem[]; customer: User })[];
  }

  // Get customers who ordered from a vendor
  async getVendorCustomers(vendorId: string): Promise<(User & { orderCount: number; totalSpent: number })[]> {
    // Get vendor's products
    const vendorProducts = await db
      .select()
      .from(products)
      .where(eq(products.vendorId, vendorId));
    
    const productIds = vendorProducts.map(p => p.id);
    if (productIds.length === 0) return [];

    // Get order items for vendor's products
    const vendorOrderItems = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.productId, productIds));

    const uniqueOrderIds = [...new Set(vendorOrderItems.map(item => item.orderId))];
    if (uniqueOrderIds.length === 0) return [];

    // Get orders
    const vendorOrders = await db
      .select()
      .from(orders)
      .where(inArray(orders.id, uniqueOrderIds));

    // Group by customer
    const customerMap = new Map<string, { orderCount: number; totalSpent: number }>();
    vendorOrders.forEach(order => {
      const current = customerMap.get(order.userId) || { orderCount: 0, totalSpent: 0 };
      // Calculate vendor-specific revenue from this order
      const orderItems = vendorOrderItems.filter(item => item.orderId === order.id);
      const orderRevenue = orderItems.reduce((sum, item) => sum + parseFloat(item.price.toString()) * item.quantity, 0);
      customerMap.set(order.userId, {
        orderCount: current.orderCount + 1,
        totalSpent: current.totalSpent + orderRevenue,
      });
    });

    // Get customer details
    const customerIds = [...customerMap.keys()];
    const customers = await db
      .select()
      .from(users)
      .where(inArray(users.id, customerIds));

    return customers.map(customer => ({
      ...customer,
      ...customerMap.get(customer.id)!,
    }));
  }

  // Update order status with history tracking
  async updateOrderStatus(orderId: string, status: string, changedBy: string, note?: string): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set({ status: status as any })
      .where(eq(orders.id, orderId))
      .returning();

    if (updated) {
      // Add to status history
      await db.insert(orderStatusHistory).values({
        orderId,
        status: status as any,
        changedBy,
        note,
      });
    }

    return updated || undefined;
  }

  // Get order status history
  async getOrderStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
    return await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(desc(orderStatusHistory.createdAt));
  }

  // Delete a product (vendor-owned only)
  async deleteProduct(id: number, vendorId: string): Promise<boolean> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.vendorId, vendorId)));

    if (!product) return false;

    await db.delete(products).where(eq(products.id, id));
    return true;
  }

  // Get comprehensive vendor analytics
  async getVendorAnalytics(vendorId: string): Promise<{
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    totalCustomers: number;
    revenueByMonth: { month: string; revenue: number }[];
    topProducts: { id: number; name: string; revenue: number; quantity: number }[];
    ordersByStatus: { status: string; count: number }[];
    recentOrders: (Order & { items: OrderItem[] })[];
  }> {
    // Get vendor's products
    const vendorProducts = await db
      .select()
      .from(products)
      .where(eq(products.vendorId, vendorId));
    
    const productIds = vendorProducts.map(p => p.id);
    
    if (productIds.length === 0) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalCustomers: 0,
        revenueByMonth: [],
        topProducts: [],
        ordersByStatus: [],
        recentOrders: [],
      };
    }

    // Get order items for vendor's products
    const vendorOrderItems = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.productId, productIds));

    const uniqueOrderIds = [...new Set(vendorOrderItems.map(item => item.orderId))];

    // Get orders
    const vendorOrders = uniqueOrderIds.length > 0 
      ? await db.select().from(orders).where(inArray(orders.id, uniqueOrderIds))
      : [];

    // Calculate totals
    const totalRevenue = vendorOrderItems.reduce((sum, item) => 
      sum + parseFloat(item.price.toString()) * item.quantity, 0);
    
    const uniqueCustomers = new Set(vendorOrders.map(o => o.userId));

    // Revenue by month (last 6 months)
    const monthlyRevenue = new Map<string, number>();
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthlyRevenue.set(monthKey, 0);
    }

    vendorOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const monthKey = orderDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (monthlyRevenue.has(monthKey)) {
        const orderRevenue = vendorOrderItems
          .filter(item => item.orderId === order.id)
          .reduce((sum, item) => sum + parseFloat(item.price.toString()) * item.quantity, 0);
        monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) || 0) + orderRevenue);
      }
    });

    // Top products
    const productRevenue = new Map<number, { revenue: number; quantity: number }>();
    vendorOrderItems.forEach(item => {
      const current = productRevenue.get(item.productId) || { revenue: 0, quantity: 0 };
      productRevenue.set(item.productId, {
        revenue: current.revenue + parseFloat(item.price.toString()) * item.quantity,
        quantity: current.quantity + item.quantity,
      });
    });

    const topProducts = vendorProducts
      .map(p => ({
        id: p.id,
        name: p.name,
        ...(productRevenue.get(p.id) || { revenue: 0, quantity: 0 }),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Orders by status
    const statusCounts = new Map<string, number>();
    vendorOrders.forEach(order => {
      statusCounts.set(order.status, (statusCounts.get(order.status) || 0) + 1);
    });

    // Recent orders
    const recentOrders = await Promise.all(
      vendorOrders
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(async order => {
          const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
          return { ...order, items: items.filter(item => productIds.includes(item.productId)) };
        })
    );

    return {
      totalRevenue,
      totalOrders: uniqueOrderIds.length,
      totalProducts: vendorProducts.length,
      totalCustomers: uniqueCustomers.size,
      revenueByMonth: [...monthlyRevenue.entries()].reverse().map(([month, revenue]) => ({ month, revenue })),
      topProducts,
      ordersByStatus: [...statusCounts.entries()].map(([status, count]) => ({ status, count })),
      recentOrders,
    };
  }

  // Auth Sessions
  async createSession(session: InsertAuthSession): Promise<AuthSession> {
    const [newSession] = await db.insert(authSessions).values(session as any).returning();
    return newSession;
  }

  async getSessionById(id: string): Promise<AuthSession | undefined> {
    const [session] = await db
      .select()
      .from(authSessions)
      .where(eq(authSessions.id, id));
    return session || undefined;
  }

  async getActiveSessionsByUserId(userId: string): Promise<AuthSession[]> {
    return await db
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.userId, userId),
          isNull(authSessions.revokedAt),
          sql`${authSessions.expiresAt} > NOW()`
        )
      )
      .orderBy(desc(authSessions.lastUsedAt));
  }

  async updateSessionLastUsed(id: string): Promise<void> {
    await db
      .update(authSessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(authSessions.id, id));
  }

  async revokeSession(id: string): Promise<void> {
    await db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(authSessions.id, id));
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    if (exceptSessionId) {
      await db
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(authSessions.userId, userId),
            isNull(authSessions.revokedAt),
            sql`${authSessions.id} != ${exceptSessionId}`
          )
        );
    } else {
      await db
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(authSessions.userId, userId),
            isNull(authSessions.revokedAt)
          )
        );
    }
  }

  async updateUserTokenVersion(userId: string): Promise<number> {
    const [updated] = await db
      .update(users)
      .set({ tokenVersion: sql`COALESCE(${users.tokenVersion}, 0) + 1` })
      .where(eq(users.id, userId))
      .returning();
    return updated?.tokenVersion || 1;
  }

  // Refunds
  async getRefundsByUserId(userId: string): Promise<(Refund & { items: RefundItem[] })[]> {
    const userRefunds = await db
      .select()
      .from(refunds)
      .where(eq(refunds.userId, userId))
      .orderBy(desc(refunds.createdAt));
    
    const result = await Promise.all(
      userRefunds.map(async (refund) => {
        const items = await db
          .select()
          .from(refundItems)
          .where(eq(refundItems.refundId, refund.id));
        return { ...refund, items };
      })
    );
    
    return result;
  }

  async getRefundById(id: string): Promise<(Refund & { items: RefundItem[] }) | undefined> {
    const [refund] = await db
      .select()
      .from(refunds)
      .where(eq(refunds.id, id));
    
    if (!refund) return undefined;
    
    const items = await db
      .select()
      .from(refundItems)
      .where(eq(refundItems.refundId, refund.id));
    
    return { ...refund, items };
  }

  async createRefund(refund: InsertRefund, items: InsertRefundItem[]): Promise<Refund> {
    const [newRefund] = await db.insert(refunds).values(refund as any).returning();
    
    if (items.length > 0) {
      await db.insert(refundItems).values(
        items.map(item => ({ ...item, refundId: newRefund.id })) as any
      );
    }
    
    return newRefund;
  }

  // Addresses
  async getAddressesByUserId(userId: string): Promise<Address[]> {
    return await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, userId))
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  }

  async getAddressById(id: number): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses).where(eq(addresses.id, id));
    return address || undefined;
  }

  async createAddress(address: InsertAddress): Promise<Address> {
    // If this is the first address or marked as default, reset other defaults
    if (address.isDefault) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, address.userId));
    }
    const [newAddress] = await db.insert(addresses).values(address as any).returning();
    return newAddress;
  }

  async updateAddress(id: number, address: Partial<InsertAddress>): Promise<Address | undefined> {
    const [updatedAddress] = await db
      .update(addresses)
      .set(address as any)
      .where(eq(addresses.id, id))
      .returning();
    return updatedAddress || undefined;
  }

  async deleteAddress(id: number): Promise<void> {
    await db.delete(addresses).where(eq(addresses.id, id));
  }

  async setDefaultAddress(userId: string, addressId: number): Promise<void> {
    // Reset all defaults for user
    await db
      .update(addresses)
      .set({ isDefault: false })
      .where(eq(addresses.userId, userId));
    // Set the new default
    await db
      .update(addresses)
      .set({ isDefault: true })
      .where(eq(addresses.id, addressId));
  }

  // Saved Payment Methods
  async getSavedPaymentsByUserId(userId: string): Promise<SavedPaymentMethod[]> {
    return await db
      .select()
      .from(savedPaymentMethods)
      .where(and(
        eq(savedPaymentMethods.userId, userId),
        eq(savedPaymentMethods.isActive, true)
      ))
      .orderBy(desc(savedPaymentMethods.isDefault), desc(savedPaymentMethods.createdAt));
  }

  async getSavedPaymentById(id: number): Promise<SavedPaymentMethod | undefined> {
    const [payment] = await db.select().from(savedPaymentMethods).where(eq(savedPaymentMethods.id, id));
    return payment || undefined;
  }

  async createSavedPayment(payment: InsertSavedPaymentMethod): Promise<SavedPaymentMethod> {
    // If this is the first payment or marked as default, reset other defaults
    if (payment.isDefault) {
      await db
        .update(savedPaymentMethods)
        .set({ isDefault: false })
        .where(eq(savedPaymentMethods.userId, payment.userId));
    }
    const [newPayment] = await db.insert(savedPaymentMethods).values(payment as any).returning();
    return newPayment;
  }

  async updateSavedPayment(id: number, payment: Partial<InsertSavedPaymentMethod>): Promise<SavedPaymentMethod | undefined> {
    const [updatedPayment] = await db
      .update(savedPaymentMethods)
      .set({ ...payment as any, updatedAt: new Date() })
      .where(eq(savedPaymentMethods.id, id))
      .returning();
    return updatedPayment || undefined;
  }

  async deleteSavedPayment(id: number): Promise<void> {
    // Soft delete - mark as inactive (regulatory compliance requires keeping records)
    await db
      .update(savedPaymentMethods)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(savedPaymentMethods.id, id));
  }

  async setDefaultPayment(userId: string, paymentId: number): Promise<void> {
    // Reset all defaults for user
    await db
      .update(savedPaymentMethods)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(savedPaymentMethods.userId, userId));
    // Set the new default
    await db
      .update(savedPaymentMethods)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(savedPaymentMethods.id, paymentId));
  }

  // OTP Verification
  async createOtpVerification(otp: InsertOtpVerification): Promise<OtpVerification> {
    const [newOtp] = await db.insert(otpVerifications).values(otp as any).returning();
    return newOtp;
  }

  async getOtpVerification(identifier: string, type: 'email' | 'phone', purpose: string): Promise<OtpVerification | undefined> {
    const [otp] = await db
      .select()
      .from(otpVerifications)
      .where(and(
        eq(otpVerifications.identifier, identifier),
        eq(otpVerifications.type, type),
        eq(otpVerifications.purpose, purpose as any),
        eq(otpVerifications.verified, false)
      ))
      .orderBy(desc(otpVerifications.createdAt))
      .limit(1);
    return otp || undefined;
  }

  async incrementOtpAttempts(id: number): Promise<void> {
    await db
      .update(otpVerifications)
      .set({ attempts: sql`${otpVerifications.attempts} + 1` })
      .where(eq(otpVerifications.id, id));
  }

  async markOtpVerified(id: number): Promise<void> {
    await db
      .update(otpVerifications)
      .set({ verified: true })
      .where(eq(otpVerifications.id, id));
  }

  async deleteExpiredOtps(): Promise<void> {
    await db
      .delete(otpVerifications)
      .where(sql`${otpVerifications.expiresAt} < NOW()`);
  }

  async deleteOtpById(id: number): Promise<void> {
    await db
      .delete(otpVerifications)
      .where(eq(otpVerifications.id, id));
  }

  // User OTP-related
  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByFirebaseUid(uid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, uid));
    return user || undefined;
  }

  async updateUserVerificationStatus(userId: string, field: 'emailVerified' | 'phoneVerified', value: boolean): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ [field]: value })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser || undefined;
  }

  async updateUserPhone(userId: string, phone: string, countryCode: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ phone, countryCode })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser || undefined;
  }

  async updateUserOnboardingStep(userId: string, step: number): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ onboardingStep: step })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser || undefined;
  }

  async updateUserFirebaseUid(userId: string, firebaseUid: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ firebaseUid })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser || undefined;
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile || undefined;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [newProfile] = await db
      .insert(userProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async updateUserProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const [updatedProfile] = await db
      .update(userProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updatedProfile || undefined;
  }

  async getReferenceData(type: 'nature_of_business' | 'end_use_markets' | 'license_types' | 'countries' | 'vendorCategories' | 'currencies' | 'paymentMethods' | 'financialInstitutions' | 'proofTypes' | 'verificationMethods'): Promise<any[]> {
    switch (type) {
      case 'nature_of_business':
        return await db.select().from(refNatureOfBusiness).where(eq(refNatureOfBusiness.isActive, true)).orderBy(refNatureOfBusiness.displayOrder);
      case 'end_use_markets':
        return await db.select().from(refEndUseMarkets).where(eq(refEndUseMarkets.isActive, true)).orderBy(refEndUseMarkets.displayOrder);
      case 'license_types':
        return await db.select().from(refLicenseTypes).where(eq(refLicenseTypes.isActive, true)).orderBy(refLicenseTypes.displayOrder);
      case 'countries':
        return await db.select().from(refCountries).where(eq(refCountries.isActive, true)).orderBy(refCountries.displayOrder);
      case 'vendorCategories':
        return await db.select().from(refVendorCategories).where(eq(refVendorCategories.isActive, true)).orderBy(refVendorCategories.displayOrder);
      case 'currencies':
        return await db.select().from(refCurrencies).where(eq(refCurrencies.isActive, true)).orderBy(refCurrencies.displayOrder);
      case 'paymentMethods':
        return await db.select().from(refPaymentMethods).where(eq(refPaymentMethods.isActive, true)).orderBy(refPaymentMethods.displayOrder);
      case 'financialInstitutions':
        return await db.select().from(refFinancialInstitutions).where(eq(refFinancialInstitutions.isActive, true)).orderBy(refFinancialInstitutions.displayOrder);
      case 'proofTypes':
        return await db.select().from(refProofTypes).where(eq(refProofTypes.isActive, true)).orderBy(refProofTypes.displayOrder);
      case 'verificationMethods':
        return await db.select().from(refVerificationMethods).where(eq(refVerificationMethods.isActive, true)).orderBy(refVerificationMethods.displayOrder);
      default:
        return [];
    }
  }

  // ===== ADMIN OPERATIONS =====

  async getAdminDashboardStats(): Promise<{
    totalSellers: number;
    activeSellers: number;
    pendingApprovals: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
    totalRefunds: number;
  }> {
    // Total sellers (vendors)
    const allSellers = await db.select().from(users).where(eq(users.userType, 'vendor'));
    const totalSellers = allSellers.length;
    const activeSellers = allSellers.filter(s => s.isActive !== false).length;
    
    // Pending approvals
    const pendingProfiles = await db.select().from(userProfiles)
      .where(or(
        eq(userProfiles.onboardingStatus, 'pending_verification'),
        eq(userProfiles.onboardingStatus, 'under_review')
      ));
    const pendingApprovals = pendingProfiles.length;
    
    // Total products
    const allProducts = await db.select().from(products);
    const totalProducts = allProducts.length;
    
    // Total orders and revenue
    const allOrders = await db.select().from(orders);
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce((sum, o) => sum + parseFloat(o.total.toString()), 0);
    
    // Total customers
    const allCustomers = await db.select().from(users).where(eq(users.userType, 'customer'));
    const totalCustomers = allCustomers.length;
    
    // Total refunds
    const allRefunds = await db.select().from(refunds);
    const totalRefunds = allRefunds.length;
    
    return {
      totalSellers,
      activeSellers,
      pendingApprovals,
      totalProducts,
      totalOrders,
      totalRevenue,
      totalCustomers,
      totalRefunds,
    };
  }

  async getAllSellers(filters?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    sellers: (User & { userProfile?: UserProfile; stats?: { products: number; orders: number; revenue: number } })[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;
    
    // Get all vendors
    let conditions: any[] = [eq(users.userType, 'vendor')];
    
    if (filters?.search) {
      conditions.push(
        or(
          ilike(users.name, `%${filters.search}%`),
          ilike(users.email, `%${filters.search}%`),
          ilike(users.username, `%${filters.search}%`)
        )
      );
    }
    
    const allVendors = await db.select().from(users)
      .where(and(...conditions))
      .orderBy(filters?.sortOrder === 'asc' ? asc(users.createdAt) : desc(users.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Get total count
    const totalResult = await db.select({ count: count() }).from(users)
      .where(and(...conditions));
    const total = totalResult[0]?.count || 0;
    
    // Get vendor profiles and stats for each seller
    const sellersWithDetails = await Promise.all(
      allVendors.map(async (seller) => {
        const [profile] = await db.select().from(userProfiles)
          .where(eq(userProfiles.userId, seller.id));
        
        // Filter by status if provided
        if (filters?.status && profile?.onboardingStatus !== filters.status) {
          return null;
        }
        
        // Get stats
        const vendorProducts = await db.select().from(products)
          .where(eq(products.vendorId, seller.id));
        const productIds = vendorProducts.map(p => p.id);
        
        let orderCount = 0;
        let revenue = 0;
        
        if (productIds.length > 0) {
          const vendorOrderItems = await db.select().from(orderItems)
            .where(inArray(orderItems.productId, productIds));
          
          const uniqueOrderIds = new Set(vendorOrderItems.map(item => item.orderId));
          orderCount = uniqueOrderIds.size;
          revenue = vendorOrderItems.reduce((sum, item) => 
            sum + parseFloat(item.price.toString()) * item.quantity, 0);
        }
        
        return {
          ...seller,
          userProfile: profile || undefined,
          stats: {
            products: vendorProducts.length,
            orders: orderCount,
            revenue,
          },
        };
      })
    );
    
    // Filter out nulls from status filtering
    const filteredSellers = sellersWithDetails.filter(Boolean) as any[];
    
    return {
      sellers: filteredSellers,
      total,
      page,
      limit,
    };
  }

  async getSellerDetails(sellerId: string): Promise<(User & { 
    userProfile?: UserProfile; 
    stats: { products: number; orders: number; revenue: number; customers: number };
    recentOrders: Order[];
  }) | undefined> {
    const [seller] = await db.select().from(users)
      .where(and(eq(users.id, sellerId), eq(users.userType, 'vendor')));
    
    if (!seller) return undefined;
    
    const [profile] = await db.select().from(userProfiles)
      .where(eq(userProfiles.userId, sellerId));
    
    // Get stats
    const vendorProducts = await db.select().from(products)
      .where(eq(products.vendorId, sellerId));
    const productIds = vendorProducts.map(p => p.id);
    
    let orderCount = 0;
    let revenue = 0;
    let customerIds = new Set<string>();
    let recentOrders: Order[] = [];
    
    if (productIds.length > 0) {
      const vendorOrderItems = await db.select().from(orderItems)
        .where(inArray(orderItems.productId, productIds));
      
      const uniqueOrderIds = [...new Set(vendorOrderItems.map(item => item.orderId))];
      orderCount = uniqueOrderIds.length;
      revenue = vendorOrderItems.reduce((sum, item) => 
        sum + parseFloat(item.price.toString()) * item.quantity, 0);
      
      if (uniqueOrderIds.length > 0) {
        const relatedOrders = await db.select().from(orders)
          .where(inArray(orders.id, uniqueOrderIds))
          .orderBy(desc(orders.createdAt))
          .limit(10);
        
        recentOrders = relatedOrders;
        relatedOrders.forEach(o => customerIds.add(o.userId));
      }
    }
    
    return {
      ...seller,
      userProfile: profile || undefined,
      stats: {
        products: vendorProducts.length,
        orders: orderCount,
        revenue,
        customers: customerIds.size,
      },
      recentOrders,
    };
  }

  async updateSellerStatus(
    sellerId: string, 
    status: 'approved' | 'rejected' | 'pending_verification' | 'under_review',
    adminId: string,
    note?: string,
    rejectionReason?: string
  ): Promise<UserProfile | undefined> {
    const [updated] = await db.update(userProfiles)
      .set({
        onboardingStatus: status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNote: note || null,
        rejectionReason: status === 'rejected' ? rejectionReason : null,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, sellerId))
      .returning();
    
    return updated || undefined;
  }

  async suspendUser(userId: string, adminId: string, reason: string): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({
        isActive: false,
        suspendedAt: new Date(),
        suspendedBy: adminId,
        suspendedReason: reason,
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updated || undefined;
  }

  async activateUser(userId: string, adminId: string): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({
        isActive: true,
        suspendedAt: null,
        suspendedBy: null,
        suspendedReason: null,
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updated || undefined;
  }

  async createAdminActionLog(log: InsertAdminActionLog): Promise<AdminActionLog> {
    const [newLog] = await db.insert(adminActionLogs).values(log).returning();
    return newLog;
  }

  async getAdminActionLogs(filters?: {
    adminId?: string;
    actionType?: string;
    targetType?: string;
    targetId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ logs: (AdminActionLog & { admin: User })[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;
    
    let conditions: any[] = [];
    
    if (filters?.adminId) {
      conditions.push(eq(adminActionLogs.adminId, filters.adminId));
    }
    if (filters?.actionType) {
      conditions.push(eq(adminActionLogs.actionType, filters.actionType as any));
    }
    if (filters?.targetType) {
      conditions.push(eq(adminActionLogs.targetType, filters.targetType));
    }
    if (filters?.targetId) {
      conditions.push(eq(adminActionLogs.targetId, filters.targetId));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const logs = await db.select()
      .from(adminActionLogs)
      .innerJoin(users, eq(adminActionLogs.adminId, users.id))
      .where(whereClause)
      .orderBy(desc(adminActionLogs.createdAt))
      .limit(limit)
      .offset(offset);
    
    const totalResult = await db.select({ count: count() })
      .from(adminActionLogs)
      .where(whereClause);
    
    return {
      logs: logs.map(row => ({
        ...row.admin_action_logs,
        admin: row.users,
      })),
      total: totalResult[0]?.count || 0,
    };
  }

  async getAllAdmins(): Promise<User[]> {
    return await db.select().from(users)
      .where(or(eq(users.userType, 'admin'), eq(users.userType, 'super_admin')))
      .orderBy(desc(users.createdAt));
  }

  async createAdmin(user: InsertUser): Promise<User> {
    const [newAdmin] = await db.insert(users).values({
      ...user,
      userType: 'admin',
    }).returning();
    return newAdmin;
  }

  // Product Reference Data APIs
  async getProductReferenceData(type: string): Promise<any[]> {
    switch (type) {
      case 'sizes':
        return await db.select().from(refProductSizes).where(eq(refProductSizes.isActive, true)).orderBy(asc(refProductSizes.displayOrder));
      case 'colors':
        return await db.select().from(refProductColors).where(eq(refProductColors.isActive, true)).orderBy(asc(refProductColors.displayOrder));
      case 'features':
        return await db.select().from(refProductFeatures).where(eq(refProductFeatures.isActive, true)).orderBy(asc(refProductFeatures.displayOrder));
      case 'performance':
        return await db.select().from(refProductPerformance).where(eq(refProductPerformance.isActive, true)).orderBy(asc(refProductPerformance.displayOrder));
      case 'thickness':
        return await db.select().from(refProductThickness).where(eq(refProductThickness.isActive, true)).orderBy(asc(refProductThickness.displayOrder));
      case 'materials':
        return await db.select().from(refProductMaterials).where(eq(refProductMaterials.isActive, true)).orderBy(asc(refProductMaterials.displayOrder));
      case 'driveTypes':
        return await db.select().from(refDriveTypes).where(eq(refDriveTypes.isActive, true)).orderBy(asc(refDriveTypes.displayOrder));
      case 'dimensionUnits':
        return await db.select().from(refDimensionUnits).where(eq(refDimensionUnits.isActive, true)).orderBy(asc(refDimensionUnits.displayOrder));
      case 'weightUnits':
        return await db.select().from(refWeightUnits).where(eq(refWeightUnits.isActive, true)).orderBy(asc(refWeightUnits.displayOrder));
      case 'controlledItemTypes':
        return await db.select().from(refControlledItemTypes).where(eq(refControlledItemTypes.isActive, true)).orderBy(asc(refControlledItemTypes.displayOrder));
      case 'pricingTerms':
        return await db.select().from(refPricingTerms).where(eq(refPricingTerms.isActive, true)).orderBy(asc(refPricingTerms.displayOrder));
      case 'manufacturingSources':
        return await db.select().from(refManufacturingSources).where(eq(refManufacturingSources.isActive, true)).orderBy(asc(refManufacturingSources.displayOrder));
      default:
        return [];
    }
  }

  // Vendor Product Management
  async createProductDraft(vendorId: string): Promise<Product> {
    const [product] = await db.insert(products).values({
      vendorId,
      status: 'draft' as any,
    }).returning();
    return product;
  }

  async getVendorProducts(vendorId: string, filters?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ products: (Product & { media: ProductMedia[]; pricingTiers: ProductPricingTier[] })[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;
    
    let conditions: any[] = [eq(products.vendorId, vendorId)];
    
    if (filters?.status) {
      conditions.push(eq(products.status, filters.status as any));
    }
    if (filters?.search) {
      conditions.push(or(
        ilike(products.name, `%${filters.search}%`),
        ilike(products.sku, `%${filters.search}%`)
      ));
    }
    
    const whereClause = and(...conditions);
    
    const productsList = await db.select()
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);
    
    const totalResult = await db.select({ count: count() })
      .from(products)
      .where(whereClause);
    
    // Get media and pricing tiers for each product
    const productsWithRelations = await Promise.all(
      productsList.map(async (product) => {
        const media = await db.select().from(productMedia)
          .where(eq(productMedia.productId, product.id))
          .orderBy(asc(productMedia.displayOrder));
        
        const pricingTiers = await db.select().from(productPricingTiers)
          .where(eq(productPricingTiers.productId, product.id))
          .orderBy(asc(productPricingTiers.minQuantity));
        
        return { ...product, media, pricingTiers };
      })
    );
    
    return {
      products: productsWithRelations,
      total: totalResult[0]?.count || 0,
    };
  }

  async getProductWithDetails(productId: number): Promise<(Product & { media: ProductMedia[]; pricingTiers: ProductPricingTier[]; vendor?: User }) | undefined> {
    const [product] = await db.select()
      .from(products)
      .where(eq(products.id, productId));
    
    if (!product) return undefined;
    
    const media = await db.select().from(productMedia)
      .where(eq(productMedia.productId, productId))
      .orderBy(asc(productMedia.displayOrder));
    
    const pricingTiers = await db.select().from(productPricingTiers)
      .where(eq(productPricingTiers.productId, productId))
      .orderBy(asc(productPricingTiers.minQuantity));
    
    const [vendor] = product.vendorId 
      ? await db.select().from(users).where(eq(users.id, product.vendorId))
      : [undefined];
    
    return { ...product, media, pricingTiers, vendor };
  }

  async updateProductData(productId: number, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, productId))
      .returning();
    return updated || undefined;
  }

  async submitProductForReview(productId: number): Promise<Product | undefined> {
    const [updated] = await db.update(products)
      .set({ 
        status: 'pending_review' as any, 
        submissionDate: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(products.id, productId))
      .returning();
    return updated || undefined;
  }

  // Product Media Management
  async addProductMedia(media: InsertProductMedia): Promise<ProductMedia> {
    const [newMedia] = await db.insert(productMedia).values(media).returning();
    return newMedia;
  }

  async updateProductMedia(mediaId: number, data: Partial<InsertProductMedia>): Promise<ProductMedia | undefined> {
    const [updated] = await db.update(productMedia)
      .set(data)
      .where(eq(productMedia.id, mediaId))
      .returning();
    return updated || undefined;
  }

  async deleteProductMedia(mediaId: number): Promise<void> {
    await db.delete(productMedia).where(eq(productMedia.id, mediaId));
  }

  async setProductCoverImage(productId: number, mediaId: number): Promise<void> {
    // Clear all cover flags for this product
    await db.update(productMedia)
      .set({ isCover: false })
      .where(eq(productMedia.productId, productId));
    
    // Set the new cover
    await db.update(productMedia)
      .set({ isCover: true })
      .where(eq(productMedia.id, mediaId));
  }

  // Product Pricing Tiers Management
  async setProductPricingTiers(productId: number, tiers: InsertProductPricingTier[]): Promise<ProductPricingTier[]> {
    // Delete existing tiers
    await db.delete(productPricingTiers).where(eq(productPricingTiers.productId, productId));
    
    if (tiers.length === 0) return [];
    
    // Insert new tiers
    const newTiers = await db.insert(productPricingTiers).values(tiers).returning();
    return newTiers;
  }

  // Admin Product Management
  async getProductsForAdmin(filters?: {
    status?: string;
    vendorId?: string;
    search?: string;
    isFeatured?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ products: (Product & { vendor: User })[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;
    
    let conditions: any[] = [];
    
    if (filters?.status) {
      conditions.push(eq(products.status, filters.status as any));
    }
    if (filters?.vendorId) {
      conditions.push(eq(products.vendorId, filters.vendorId));
    }
    if (filters?.search) {
      conditions.push(or(
        ilike(products.name, `%${filters.search}%`),
        ilike(products.sku, `%${filters.search}%`)
      ));
    }
    if (filters?.isFeatured !== undefined) {
      conditions.push(eq(products.isFeatured, filters.isFeatured));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const productsList = await db.select()
      .from(products)
      .innerJoin(users, eq(products.vendorId, users.id))
      .where(whereClause)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);
    
    const totalResult = await db.select({ count: count() })
      .from(products)
      .where(whereClause);
    
    return {
      products: productsList.map(row => ({
        ...row.products,
        vendor: row.users,
      })),
      total: totalResult[0]?.count || 0,
    };
  }

  async approveProduct(productId: number, adminId: string, note?: string): Promise<Product | undefined> {
    const [updated] = await db.update(products)
      .set({
        status: 'approved' as any,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNote: note || null,
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();
    return updated || undefined;
  }

  async rejectProduct(productId: number, adminId: string, reason: string): Promise<Product | undefined> {
    const [updated] = await db.update(products)
      .set({
        status: 'rejected' as any,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();
    return updated || undefined;
  }

  async suspendProduct(productId: number, adminId: string, reason: string): Promise<Product | undefined> {
    const [updated] = await db.update(products)
      .set({
        status: 'suspended' as any,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();
    return updated || undefined;
  }

  async featureProduct(productId: number, featured: boolean): Promise<Product | undefined> {
    const [updated] = await db.update(products)
      .set({ isFeatured: featured, updatedAt: new Date() })
      .where(eq(products.id, productId))
      .returning();
    return updated || undefined;
  }

  // Product Review Notes (admin feedback to sellers)
  async addProductReviewNote(note: InsertProductReviewNote): Promise<ProductReviewNote> {
    const [newNote] = await db.insert(productReviewNotes).values(note).returning();
    return newNote;
  }

  async getProductReviewNotes(productId: number, sellerOnly: boolean = false): Promise<(ProductReviewNote & { admin: { id: string; name: string } })[]> {
    let query = db
      .select({
        id: productReviewNotes.id,
        productId: productReviewNotes.productId,
        adminId: productReviewNotes.adminId,
        message: productReviewNotes.message,
        requiresChanges: productReviewNotes.requiresChanges,
        isVisibleToSeller: productReviewNotes.isVisibleToSeller,
        createdAt: productReviewNotes.createdAt,
        admin: {
          id: users.id,
          name: users.name,
        },
      })
      .from(productReviewNotes)
      .innerJoin(users, eq(productReviewNotes.adminId, users.id))
      .where(
        sellerOnly 
          ? and(eq(productReviewNotes.productId, productId), eq(productReviewNotes.isVisibleToSeller, true))
          : eq(productReviewNotes.productId, productId)
      )
      .orderBy(desc(productReviewNotes.createdAt));
    
    return await query;
  }

  // Vendor Onboarding Management (Admin)
  async getVendorsForAdmin(filters: {
    status?: string;
    search?: string;
    country?: string;
    category?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ vendors: (UserProfile & { user: User })[], total: number, page: number, limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let conditions: any[] = [];

    // By default, only show vendors who have completed onboarding (submitted for approval)
    if (filters.status) {
      conditions.push(eq(userProfiles.onboardingStatus, filters.status as any));
    } else {
      // Default: show under_review vendors (those who submitted for approval)
      conditions.push(eq(userProfiles.onboardingStatus, 'under_review'));
    }

    if (filters.search) {
      conditions.push(
        or(
          ilike(userProfiles.companyName, `%${filters.search}%`),
          ilike(userProfiles.tradeBrandName, `%${filters.search}%`),
          ilike(userProfiles.companyEmail, `%${filters.search}%`),
          ilike(users.name, `%${filters.search}%`),
          ilike(users.email, `%${filters.search}%`)
        )
      );
    }

    if (filters.country) {
      conditions.push(eq(userProfiles.country, filters.country));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: count() })
      .from(userProfiles)
      .innerJoin(users, eq(userProfiles.userId, users.id))
      .where(whereClause);

    const vendorsList = await db
      .select({
        userProfile: userProfiles,
        user: users,
      })
      .from(userProfiles)
      .innerJoin(users, eq(userProfiles.userId, users.id))
      .where(whereClause)
      .orderBy(desc(userProfiles.submittedAt), desc(userProfiles.createdAt))
      .limit(limit)
      .offset(offset);

    const vendors = vendorsList.map(v => ({
      ...v.userProfile,
      user: v.user,
    }));

    return {
      vendors,
      total: countResult?.count || 0,
      page,
      limit,
    };
  }

  async getUserProfileByUserId(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async approveVendorOnboarding(userId: string, adminId: string, note?: string): Promise<UserProfile | undefined> {
    const [updated] = await db.update(userProfiles)
      .set({
        onboardingStatus: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNote: note,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId))
      .returning();

    // Also activate the user
    if (updated) {
      await db.update(users)
        .set({ isActive: true })
        .where(eq(users.id, userId));
    }

    return updated || undefined;
  }

  async rejectVendorOnboarding(userId: string, adminId: string, reason: string, note?: string): Promise<UserProfile | undefined> {
    const [updated] = await db.update(userProfiles)
      .set({
        onboardingStatus: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNote: note,
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId))
      .returning();

    return updated || undefined;
  }

  async suspendVendor(userId: string, adminId: string, reason: string): Promise<UserProfile | undefined> {
    const [updated] = await db.update(userProfiles)
      .set({
        onboardingStatus: 'suspended',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNote: reason,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId))
      .returning();

    // Also deactivate the user
    if (updated) {
      await db.update(users)
        .set({ isActive: false })
        .where(eq(users.id, userId));
    }

    return updated || undefined;
  }

  async reactivateVendor(userId: string, adminId: string, note?: string): Promise<UserProfile | undefined> {
    const [updated] = await db.update(userProfiles)
      .set({
        onboardingStatus: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNote: note,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId))
      .returning();

    // Also activate the user
    if (updated) {
      await db.update(users)
        .set({ isActive: true })
        .where(eq(users.id, userId));
    }

    return updated || undefined;
  }

  // ===== ADMIN ORDERS MANAGEMENT =====
  async getOrdersForAdmin(filters: {
    status?: string;
    vendorId?: string;
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{ orders: (Order & { items: OrderItem[], user: User })[], total: number, page: number, limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    // If vendorId filter is provided, first get order IDs with that vendor's items
    let vendorOrderIds: string[] | undefined;
    if (filters.vendorId) {
      const vendorItems = await db
        .select({ orderId: orderItems.orderId })
        .from(orderItems)
        .where(eq(orderItems.vendorId, filters.vendorId));
      vendorOrderIds = [...new Set(vendorItems.map(i => i.orderId))];
      if (vendorOrderIds.length === 0) {
        return { orders: [], total: 0, page, limit };
      }
    }

    let conditions: any[] = [];

    if (vendorOrderIds) {
      conditions.push(inArray(orders.id, vendorOrderIds));
    }

    if (filters.status) {
      conditions.push(eq(orders.status, filters.status as any));
    }

    if (filters.dateFrom) {
      conditions.push(gte(orders.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(orders.createdAt, filters.dateTo));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: count() })
      .from(orders)
      .where(whereClause);

    const ordersList = await db
      .select()
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    // Get all order items for these orders
    const orderIds = ordersList.map(o => o.orders.id);
    let allItems: OrderItem[] = [];
    if (orderIds.length > 0) {
      // If vendor filter, only get that vendor's items
      if (filters.vendorId) {
        allItems = await db.select().from(orderItems).where(
          and(
            inArray(orderItems.orderId, orderIds),
            eq(orderItems.vendorId, filters.vendorId)
          )
        );
      } else {
        allItems = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
      }
    }

    const ordersWithItems = ordersList.map(o => ({
      ...o.orders,
      user: o.users,
      items: allItems.filter(item => item.orderId === o.orders.id),
    }));

    return {
      orders: ordersWithItems,
      total: countResult?.count || 0,
      page,
      limit,
    };
  }

  async getOrderByIdForAdmin(orderId: string): Promise<(Order & { items: (OrderItem & { product: Product })[], user: User, statusHistory: OrderStatusHistory[] }) | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return undefined;

    const [user] = await db.select().from(users).where(eq(users.id, order.userId));
    const items = await db
      .select({
        item: orderItems,
        product: products,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, orderId));

    const statusHistory = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(desc(orderStatusHistory.createdAt));

    return {
      ...order,
      user,
      items: items.map(i => ({ ...i.item, product: i.product! })),
      statusHistory,
    };
  }

  // ===== VENDOR ORDERS MANAGEMENT =====
  async getOrdersForVendor(vendorId: string, filters: {
    status?: string;
    vendorId?: string;
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{ orders: (Order & { items: OrderItem[], user: User })[], total: number, page: number, limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    // Use filtered vendorId if provided, otherwise use the logged-in vendor's ID
    const targetVendorId = filters.vendorId || vendorId;

    // Get order IDs that contain items from this vendor
    const vendorOrderItems = await db
      .select({ orderId: orderItems.orderId })
      .from(orderItems)
      .where(eq(orderItems.vendorId, targetVendorId));

    const vendorOrderIds = [...new Set(vendorOrderItems.map(i => i.orderId))];

    if (vendorOrderIds.length === 0) {
      return { orders: [], total: 0, page, limit };
    }

    let conditions: any[] = [inArray(orders.id, vendorOrderIds)];

    if (filters.status) {
      conditions.push(eq(orders.status, filters.status as any));
    }

    if (filters.dateFrom) {
      conditions.push(gte(orders.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(orders.createdAt, filters.dateTo));
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: count() })
      .from(orders)
      .where(whereClause);

    const ordersList = await db
      .select()
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);

    // Get vendor's order items only
    const allVendorItems = await db
      .select()
      .from(orderItems)
      .where(and(
        inArray(orderItems.orderId, ordersList.map(o => o.orders.id)),
        eq(orderItems.vendorId, targetVendorId)
      ));

    const ordersWithItems = ordersList.map(o => ({
      ...o.orders,
      user: o.users,
      items: allVendorItems.filter(item => item.orderId === o.orders.id),
    }));

    return {
      orders: ordersWithItems,
      total: countResult?.count || 0,
      page,
      limit,
    };
  }

  async updateOrderStatus(orderId: string, status: string, changedBy: string, note?: string): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set({ status: status as any })
      .where(eq(orders.id, orderId))
      .returning();

    if (updated) {
      await db.insert(orderStatusHistory).values({
        orderId,
        status: status as any,
        changedBy,
        note,
      });
    }

    return updated || undefined;
  }

  // ===== REFUND MANAGEMENT =====
  async getRefundsForAdmin(filters: {
    status?: string;
    vendorId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ refunds: (Refund & { user: User, order: Order })[], total: number, page: number, limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let conditions: any[] = [];

    if (filters.status) {
      conditions.push(eq(refunds.requestStatus, filters.status as any));
    }

    if (filters.vendorId) {
      conditions.push(eq(refunds.vendorId, filters.vendorId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: count() })
      .from(refunds)
      .where(whereClause);

    const refundsList = await db
      .select()
      .from(refunds)
      .innerJoin(users, eq(refunds.userId, users.id))
      .innerJoin(orders, eq(refunds.orderId, orders.id))
      .where(whereClause)
      .orderBy(desc(refunds.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      refunds: refundsList.map(r => ({
        ...r.refunds,
        user: r.users,
        order: r.orders,
      })),
      total: countResult?.count || 0,
      page,
      limit,
    };
  }

  async getRefundById(refundId: string): Promise<(Refund & { user: User, order: Order, items: RefundItem[] }) | undefined> {
    const [result] = await db
      .select()
      .from(refunds)
      .innerJoin(users, eq(refunds.userId, users.id))
      .innerJoin(orders, eq(refunds.orderId, orders.id))
      .where(eq(refunds.id, refundId));

    if (!result) return undefined;

    const items = await db.select().from(refundItems).where(eq(refundItems.refundId, refundId));

    return {
      ...result.refunds,
      user: result.users,
      order: result.orders,
      items,
    };
  }

  async createRefundRequest(data: {
    orderId: string;
    userId: string;
    vendorId?: string;
    amount: string;
    reason: string;
    customerNote?: string;
  }): Promise<Refund> {
    const [refund] = await db.insert(refunds).values({
      orderId: data.orderId,
      userId: data.userId,
      vendorId: data.vendorId,
      amount: data.amount,
      reason: data.reason,
      customerNote: data.customerNote,
      requestStatus: 'pending',
      status: 'processing',
    }).returning();
    return refund;
  }

  async approveRefund(refundId: string, adminId: string, note?: string): Promise<Refund | undefined> {
    const [updated] = await db.update(refunds)
      .set({
        requestStatus: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        adminNote: note,
      })
      .where(eq(refunds.id, refundId))
      .returning();
    return updated || undefined;
  }

  async rejectRefund(refundId: string, adminId: string, reason: string, note?: string): Promise<Refund | undefined> {
    const [updated] = await db.update(refunds)
      .set({
        requestStatus: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: reason,
        adminNote: note,
      })
      .where(eq(refunds.id, refundId))
      .returning();
    return updated || undefined;
  }

  // ===== COMMISSION & PLATFORM SETTINGS =====
  async getPlatformSetting(key: string): Promise<PlatformSetting | undefined> {
    const [setting] = await db.select().from(platformSettings).where(eq(platformSettings.key, key));
    return setting;
  }

  async setPlatformSetting(key: string, value: string, adminId: string, description?: string): Promise<PlatformSetting> {
    const existing = await this.getPlatformSetting(key);
    
    if (existing) {
      const [updated] = await db.update(platformSettings)
        .set({
          value,
          description: description || existing.description,
          updatedBy: adminId,
          updatedAt: new Date(),
        })
        .where(eq(platformSettings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(platformSettings)
        .values({
          key,
          value,
          description,
          updatedBy: adminId,
        })
        .returning();
      return created;
    }
  }

  async getVendorCommission(vendorId: string): Promise<{ percent: string, isCustom: boolean }> {
    const profile = await this.getUserProfileByUserId(vendorId);
    if (profile?.commissionPercent) {
      return { percent: profile.commissionPercent, isCustom: true };
    }
    
    const defaultSetting = await this.getPlatformSetting('default_commission_percent');
    return { percent: defaultSetting?.value || '10', isCustom: false };
  }

  async setVendorCommission(vendorId: string, percent: string): Promise<UserProfile | undefined> {
    const [updated] = await db.update(userProfiles)
      .set({
        commissionPercent: percent,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, vendorId))
      .returning();
    return updated || undefined;
  }

  // ===== VENDOR FINANCIALS =====
  
  async getVendorFinancials(vendorId: string): Promise<{
    totalEarnings: number;
    totalCommission: number;
    netEarnings: number;
    pendingPayouts: number;
    completedPayouts: number;
    currentMonthEarnings: number;
    lastMonthEarnings: number;
    orderCount: number;
    averageOrderValue: number;
  }> {
    const vendorOrders = await db.select()
      .from(orders)
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(products.vendorId, vendorId));
    
    const commission = await this.getVendorCommission(vendorId);
    const commissionRate = parseFloat(commission.percent) / 100;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    let totalEarnings = 0;
    let currentMonthEarnings = 0;
    let lastMonthEarnings = 0;
    const uniqueOrders = new Set<string>();
    
    for (const row of vendorOrders) {
      const itemTotal = parseFloat(row.order_items.price) * row.order_items.quantity;
      totalEarnings += itemTotal;
      uniqueOrders.add(row.orders.id);
      
      const orderDate = new Date(row.orders.createdAt);
      if (orderDate >= startOfMonth) {
        currentMonthEarnings += itemTotal;
      } else if (orderDate >= startOfLastMonth && orderDate <= endOfLastMonth) {
        lastMonthEarnings += itemTotal;
      }
    }
    
    const totalCommission = totalEarnings * commissionRate;
    const netEarnings = totalEarnings - totalCommission;
    const orderCount = uniqueOrders.size;
    const averageOrderValue = orderCount > 0 ? totalEarnings / orderCount : 0;
    
    return {
      totalEarnings,
      totalCommission,
      netEarnings,
      pendingPayouts: 0,
      completedPayouts: 0,
      currentMonthEarnings,
      lastMonthEarnings,
      orderCount,
      averageOrderValue,
    };
  }
  
  async getVendorEarningsByMonth(vendorId: string, months: number = 12): Promise<{ month: string; earnings: number; commission: number; net: number }[]> {
    const vendorOrders = await db.select()
      .from(orders)
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(products.vendorId, vendorId));
    
    const commission = await this.getVendorCommission(vendorId);
    const commissionRate = parseFloat(commission.percent) / 100;
    
    const monthlyData: Record<string, { earnings: number; commission: number; net: number }> = {};
    
    for (const row of vendorOrders) {
      const orderDate = new Date(row.orders.createdAt);
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { earnings: 0, commission: 0, net: 0 };
      }
      
      const itemTotal = parseFloat(row.order_items.price) * row.order_items.quantity;
      const itemCommission = itemTotal * commissionRate;
      
      monthlyData[monthKey].earnings += itemTotal;
      monthlyData[monthKey].commission += itemCommission;
      monthlyData[monthKey].net += itemTotal - itemCommission;
    }
    
    const result = Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-months);
    
    return result;
  }
  
  async getVendorRefunds(vendorId: string, filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ refunds: (Refund & { order: Order; items: RefundItem[] })[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const offset = (page - 1) * limit;
    
    const conditions = [eq(refunds.vendorId, vendorId)];
    if (filters?.status) {
      conditions.push(sql`${refunds.requestStatus} = ${filters.status}`);
    }
    
    const [countResult] = await db.select({ count: count() })
      .from(refunds)
      .where(and(...conditions));
    
    const refundsData = await db.select()
      .from(refunds)
      .where(and(...conditions))
      .orderBy(desc(refunds.createdAt))
      .limit(limit)
      .offset(offset);
    
    const refundsWithDetails = await Promise.all(refundsData.map(async (refund) => {
      const [order] = await db.select().from(orders).where(eq(orders.id, refund.orderId));
      const items = await db.select().from(refundItems).where(eq(refundItems.refundId, refund.id));
      return { ...refund, order, items };
    }));
    
    return {
      refunds: refundsWithDetails,
      total: countResult?.count || 0,
    };
  }
  
  async updateVendorStock(vendorId: string, updates: { productId: number; stock: number }[]): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;
    
    for (const { productId, stock } of updates) {
      try {
        const [product] = await db.select().from(products).where(
          and(eq(products.id, productId), eq(products.vendorId, vendorId))
        );
        
        if (product) {
          await db.update(products)
            .set({ stock, updatedAt: new Date() })
            .where(eq(products.id, productId));
          updated++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }
    
    return { updated, failed };
  }

  // ===== VENDOR NOTIFICATIONS =====
  
  async getVendorNotifications(vendorId: string, filters?: {
    type?: string;
    unreadOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ notifications: VendorNotification[]; total: number; unreadCount: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;
    
    const conditions = [eq(vendorNotifications.vendorId, vendorId)];
    if (filters?.type) {
      conditions.push(sql`${vendorNotifications.type} = ${filters.type}`);
    }
    if (filters?.unreadOnly) {
      conditions.push(eq(vendorNotifications.isRead, false));
    }
    
    const [countResult] = await db.select({ count: count() })
      .from(vendorNotifications)
      .where(and(...conditions));
    
    const [unreadResult] = await db.select({ count: count() })
      .from(vendorNotifications)
      .where(and(eq(vendorNotifications.vendorId, vendorId), eq(vendorNotifications.isRead, false)));
    
    const notifications = await db.select()
      .from(vendorNotifications)
      .where(and(...conditions))
      .orderBy(desc(vendorNotifications.createdAt))
      .limit(limit)
      .offset(offset);
    
    return {
      notifications,
      total: countResult?.count || 0,
      unreadCount: unreadResult?.count || 0,
    };
  }
  
  async createVendorNotification(notification: InsertVendorNotification): Promise<VendorNotification> {
    const [created] = await db.insert(vendorNotifications)
      .values(notification as any)
      .returning();
    return created;
  }
  
  async markNotificationRead(vendorId: string, notificationId: number): Promise<VendorNotification | undefined> {
    const [updated] = await db.update(vendorNotifications)
      .set({ isRead: true })
      .where(and(eq(vendorNotifications.id, notificationId), eq(vendorNotifications.vendorId, vendorId)))
      .returning();
    return updated;
  }
  
  async markAllNotificationsRead(vendorId: string): Promise<number> {
    const result = await db.update(vendorNotifications)
      .set({ isRead: true })
      .where(and(eq(vendorNotifications.vendorId, vendorId), eq(vendorNotifications.isRead, false)));
    return result.rowCount || 0;
  }
  
  async deleteNotification(vendorId: string, notificationId: number): Promise<boolean> {
    const result = await db.delete(vendorNotifications)
      .where(and(eq(vendorNotifications.id, notificationId), eq(vendorNotifications.vendorId, vendorId)));
    return (result.rowCount || 0) > 0;
  }

  // ===== SUPPORT TICKETS =====
  
  async createTicket(ticket: InsertSupportTicket, initialMessage: string): Promise<SupportTicket> {
    const [newTicket] = await db.insert(supportTickets)
      .values(ticket as any)
      .returning();
    
    await db.insert(ticketMessages).values({
      ticketId: newTicket.id,
      senderId: ticket.customerId,
      senderType: 'customer',
      message: initialMessage,
      isInternal: false,
    });
    
    return newTicket;
  }
  
  async getCustomerTickets(customerId: string, filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ tickets: (SupportTicket & { order: Order; messagesCount: number })[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const offset = (page - 1) * limit;
    
    const conditions = [eq(supportTickets.customerId, customerId)];
    if (filters?.status) {
      conditions.push(sql`${supportTickets.status} = ${filters.status}`);
    }
    
    const [countResult] = await db.select({ count: count() })
      .from(supportTickets)
      .where(and(...conditions));
    
    const ticketsData = await db.select()
      .from(supportTickets)
      .where(and(...conditions))
      .orderBy(desc(supportTickets.createdAt))
      .limit(limit)
      .offset(offset);
    
    const ticketsWithDetails = await Promise.all(ticketsData.map(async (ticket) => {
      const [order] = await db.select().from(orders).where(eq(orders.id, ticket.orderId));
      const [messageCount] = await db.select({ count: count() })
        .from(ticketMessages)
        .where(eq(ticketMessages.ticketId, ticket.id));
      
      return {
        ...ticket,
        order,
        messagesCount: messageCount?.count || 0,
      };
    }));
    
    return {
      tickets: ticketsWithDetails,
      total: countResult?.count || 0,
    };
  }
  
  async getTicketById(ticketId: string): Promise<(SupportTicket & { 
    order: Order; 
    customer: User;
    assignedTo?: User;
    messages: (TicketMessage & { sender: User; attachments: TicketAttachment[] })[];
  }) | undefined> {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
    if (!ticket) return undefined;
    
    const [order] = await db.select().from(orders).where(eq(orders.id, ticket.orderId));
    const [customer] = await db.select().from(users).where(eq(users.id, ticket.customerId));
    
    let assignedTo: User | undefined;
    if (ticket.assignedToId) {
      const [admin] = await db.select().from(users).where(eq(users.id, ticket.assignedToId));
      assignedTo = admin;
    }
    
    const messagesData = await db.select()
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(asc(ticketMessages.createdAt));
    
    const messagesWithDetails = await Promise.all(messagesData.map(async (msg) => {
      const [sender] = await db.select().from(users).where(eq(users.id, msg.senderId));
      const attachments = await db.select()
        .from(ticketAttachments)
        .where(eq(ticketAttachments.messageId, msg.id));
      
      return {
        ...msg,
        sender,
        attachments,
      };
    }));
    
    return {
      ...ticket,
      order,
      customer,
      assignedTo,
      messages: messagesWithDetails,
    };
  }
  
  async addTicketMessage(message: InsertTicketMessage): Promise<TicketMessage> {
    const [newMessage] = await db.insert(ticketMessages).values(message as any).returning();
    
    await db.update(supportTickets)
      .set({ updatedAt: new Date() })
      .where(eq(supportTickets.id, message.ticketId));
    
    return newMessage;
  }
  
  async addTicketAttachment(attachment: InsertTicketAttachment): Promise<TicketAttachment> {
    const [newAttachment] = await db.insert(ticketAttachments).values(attachment as any).returning();
    return newAttachment;
  }
  
  async getAllTickets(filters?: {
    status?: string;
    priority?: string;
    assignedToId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ tickets: (SupportTicket & { order: Order; customer: User; assignedTo?: User; messagesCount: number })[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const offset = (page - 1) * limit;
    
    const conditions: any[] = [];
    if (filters?.status) {
      conditions.push(sql`${supportTickets.status} = ${filters.status}`);
    }
    if (filters?.priority) {
      conditions.push(sql`${supportTickets.priority} = ${filters.priority}`);
    }
    if (filters?.assignedToId) {
      conditions.push(eq(supportTickets.assignedToId, filters.assignedToId));
    }
    
    let countQuery = db.select({ count: count() }).from(supportTickets);
    let dataQuery = db.select().from(supportTickets);
    
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions)) as any;
      dataQuery = dataQuery.where(and(...conditions)) as any;
    }
    
    const [countResult] = await countQuery;
    
    const ticketsData = await dataQuery
      .orderBy(desc(supportTickets.createdAt))
      .limit(limit)
      .offset(offset);
    
    const ticketsWithDetails = await Promise.all(ticketsData.map(async (ticket) => {
      const [order] = await db.select().from(orders).where(eq(orders.id, ticket.orderId));
      const [customer] = await db.select().from(users).where(eq(users.id, ticket.customerId));
      const [messageCount] = await db.select({ count: count() })
        .from(ticketMessages)
        .where(eq(ticketMessages.ticketId, ticket.id));
      
      let assignedTo: User | undefined;
      if (ticket.assignedToId) {
        const [admin] = await db.select().from(users).where(eq(users.id, ticket.assignedToId));
        assignedTo = admin;
      }
      
      return {
        ...ticket,
        order,
        customer,
        assignedTo,
        messagesCount: messageCount?.count || 0,
      };
    }));
    
    return {
      tickets: ticketsWithDetails,
      total: countResult?.count || 0,
    };
  }
  
  async assignTicket(ticketId: string, adminId: string): Promise<SupportTicket | undefined> {
    const [updated] = await db.update(supportTickets)
      .set({
        assignedToId: adminId,
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, ticketId))
      .returning();
    return updated || undefined;
  }
  
  async updateTicketStatus(ticketId: string, status: string): Promise<SupportTicket | undefined> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    } else if (status === 'closed') {
      updateData.closedAt = new Date();
    }
    
    const [updated] = await db.update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, ticketId))
      .returning();
    return updated || undefined;
  }
  
  async updateTicketPriority(ticketId: string, priority: string): Promise<SupportTicket | undefined> {
    const [updated] = await db.update(supportTickets)
      .set({
        priority: priority as any,
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, ticketId))
      .returning();
    return updated || undefined;
  }
}

export const storage = new DatabaseStorage();
