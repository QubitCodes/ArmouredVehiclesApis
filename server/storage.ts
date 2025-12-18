// Integration: blueprint:javascript_database
import { 
  users, products, categories, reviews, cartItems, orders, orderItems, authSessions,
  refunds, refundItems, addresses, savedPaymentMethods, orderStatusHistory,
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
  type OrderStatusHistory, type InsertOrderStatusHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, or, ilike, isNull, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: string, data: { name?: string; email?: string }): Promise<User | undefined>;

  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

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

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category as any).returning();
    return newCategory;
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
}

export const storage = new DatabaseStorage();
