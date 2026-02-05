import { sequelize } from '../config/database';
// Models
import { User } from './User';
import { AuthSession } from './AuthSession';
import { Category } from './Category';
import { Product, ProductMedia, ProductPricingTier, ProductStatus } from './Product';
import { ProductSpecification } from './ProductSpecification';
import { OtpVerification } from './OtpVerification';
import { UserProfile } from './UserProfile';
import { Address } from './Address';
import { Review } from './Review';
import { Cart, CartItem } from './Cart';
import { Wishlist, WishlistItem } from './Wishlist';
import { Order, OrderItem } from './Order';
import { Invoice } from './Invoice';
import { WithdrawalRequest } from './WithdrawalRequest';
import { PlatformSetting } from './PlatformSetting';
import { FinancialLog } from './FinancialLog';
import { UserWallet } from './UserWallet';
import { Transaction } from './Transaction';
import { PayoutRequest } from './PayoutRequest';
import FrontendSlider from './FrontendSlider';
import FrontendAd from './FrontendAd';
import { RefProductBrand } from './RefProductBrand';
import { UserPermission } from './UserPermission';
import { RefPermission } from './RefPermission';
import * as ReferenceModels from './Reference';


// Initialize associations
const initAssociations = () => {
  // User <-> AuthSession
  User.hasMany(AuthSession, { foreignKey: 'user_id', as: 'sessions' });
  AuthSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // Finance Associations
  User.hasMany(WithdrawalRequest, { foreignKey: 'user_id', as: 'withdrawals' });
  WithdrawalRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  User.hasMany(FinancialLog, { foreignKey: 'user_id', as: 'financial_logs' });
  FinancialLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // --- Financial Module Associations ---
  User.hasOne(UserWallet, { foreignKey: 'user_id', as: 'wallet' });
  UserWallet.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  User.hasMany(PayoutRequest, { foreignKey: 'user_id', as: 'payout_requests' });
  PayoutRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  User.hasMany(PayoutRequest, { foreignKey: 'approved_by', as: 'approved_payouts' });
  PayoutRequest.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

  User.hasMany(Transaction, { foreignKey: 'source_user_id', as: 'sent_transactions' });
  User.hasMany(Transaction, { foreignKey: 'destination_user_id', as: 'received_transactions' });
  Transaction.belongsTo(User, { foreignKey: 'source_user_id', as: 'source' });
  Transaction.belongsTo(User, { foreignKey: 'destination_user_id', as: 'destination' });

  PayoutRequest.hasOne(Transaction, { foreignKey: 'payout_request_id', as: 'transaction' });
  Transaction.belongsTo(PayoutRequest, { foreignKey: 'payout_request_id', as: 'payout_request' });


  // Category Associations
  Category.hasMany(Category, { foreignKey: 'parent_id', as: 'children' });
  Category.belongsTo(Category, { foreignKey: 'parent_id', as: 'parent' });

  Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
  Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

  Category.hasMany(Product, { foreignKey: 'main_category_id', as: 'main_category_products' });
  Product.belongsTo(Category, { foreignKey: 'main_category_id', as: 'main_category' });

  Product.belongsTo(Category, { foreignKey: 'sub_category_id', as: 'sub_category' });

  // Product Associations
  Product.hasMany(ProductMedia, { foreignKey: 'product_id', as: 'media' });
  ProductMedia.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

  Product.hasMany(ProductPricingTier, { foreignKey: 'product_id', as: 'pricing_tiers' });
  ProductPricingTier.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

  Product.belongsTo(User, { foreignKey: 'vendor_id', as: 'vendor' });

  Product.hasMany(ProductSpecification, { foreignKey: 'product_id', as: 'product_specifications' });
  ProductSpecification.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

  Product.belongsTo(RefProductBrand, { foreignKey: 'brand_id', as: 'brand' });
  RefProductBrand.hasMany(Product, { foreignKey: 'brand_id', as: 'products' });

  // User <-> UserProfile
  User.hasOne(UserProfile, { foreignKey: 'user_id', as: 'profile' });
  UserProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  UserProfile.belongsTo(ReferenceModels.RefBuyerType, { foreignKey: 'type_of_buyer', as: 'buyerType' });
  UserProfile.belongsTo(ReferenceModels.RefProcurementPurpose, { foreignKey: 'procurement_purpose', as: 'procurementPurpose' });
  UserProfile.belongsTo(ReferenceModels.RefEndUserType, { foreignKey: 'end_user_type', as: 'endUserType' });

  // User <-> Address
  User.hasMany(Address, { foreignKey: 'user_id', as: 'addresses' });
  Address.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // Product <-> Review
  Product.hasMany(Review, { foreignKey: 'product_id', as: 'reviews' });
  Review.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

  // User <-> Review
  User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });
  Review.belongsTo(User, { foreignKey: 'user_id', as: 'reviewer' });

  // --- Cart Associations ---
  // User/Session -> Cart is handled via query, no strict association needed on User model 
  // unless we want User.hasOne(Cart)

  Cart.hasMany(CartItem, { foreignKey: 'cart_id', as: 'items' });
  CartItem.belongsTo(Cart, { foreignKey: 'cart_id', as: 'cart' });

  CartItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

  // --- Wishlist Associations ---
  Wishlist.hasMany(WishlistItem, { foreignKey: 'wishlist_id', as: 'items' });
  WishlistItem.belongsTo(Wishlist, { foreignKey: 'wishlist_id', as: 'wishlist' });

  WishlistItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

  // --- Order Associations ---
  User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
  User.hasMany(Order, { foreignKey: 'vendor_id', as: 'vendor_orders' }); // Correct alias for vendor relation
  Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Order.belongsTo(User, { foreignKey: 'vendor_id', as: 'vendor' });

  Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
  OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

  OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

  // --- Invoice Associations ---
  Order.hasMany(Invoice, { foreignKey: 'order_id', as: 'invoices' });
  Invoice.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
};

// Run associations
initAssociations();

const syncDatabase = async () => {
  try {
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database & Tables synced (Alter Mode)');
    } else {
      console.log('ℹ️ Production mode: Skipping auto-sync. Use migrations.');
    }
  } catch (error) {
    console.error('❌ Database sync failed:', error);
  }
};

export {
  sequelize,
  syncDatabase,
  User,
  AuthSession,
  Category,
  Product,
  ProductMedia,
  ProductPricingTier,
  ProductStatus,
  ProductSpecification,
  OtpVerification,
  UserProfile,
  Address,
  Review,
  ReferenceModels,
  Cart,
  CartItem,
  Wishlist,
  WishlistItem,
  Order,
  OrderItem,
  WithdrawalRequest,
  PlatformSetting,
  FinancialLog,
  UserWallet,
  Transaction,
  PayoutRequest,
  FrontendSlider,
  FrontendAd,
  RefProductBrand,
  UserPermission,
  RefPermission,
  Invoice
};
