import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userTypeEnum = pgEnum('user_type', ['customer', 'vendor', 'admin', 'super_admin']);
export const productConditionEnum = pgEnum('product_condition', ['new', 'used', 'refurbished']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']);
export const refundStatusEnum = pgEnum('refund_status', ['processing', 'completed', 'failed']);
export const otpTypeEnum = pgEnum('otp_type', ['email', 'phone']);
export const otpPurposeEnum = pgEnum('otp_purpose', ['registration', 'login', 'reset_password', 'verify_phone']);

// Reference Tables (for dropdowns and foreign keys)
export const refNatureOfBusiness = pgTable("ref_nature_of_business", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const refEndUseMarkets = pgTable("ref_end_use_markets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const refLicenseTypes = pgTable("ref_license_types", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const refCountries = pgTable("ref_countries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  flag: text("flag"),
  phoneCode: text("phone_code"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

// Vendor selling categories (for Step 4 onboarding)
export const refVendorCategories = pgTable("ref_vendor_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  isControlled: boolean("is_controlled").default(false),
  controlNote: text("control_note"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

// Currencies reference table
export const refCurrencies = pgTable("ref_currencies", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  symbol: text("symbol"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

// Payment methods for vendors (Step 5)
export const refPaymentMethods = pgTable("ref_payment_methods", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  icon: text("icon"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

// Financial institutions (banks)
export const refFinancialInstitutions = pgTable("ref_financial_institutions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  countryCode: text("country_code").notNull(),
  swiftCode: text("swift_code"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

// Bank proof types
export const refProofTypes = pgTable("ref_proof_types", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

// Identity verification methods
export const refVerificationMethods = pgTable("ref_verification_methods", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isAvailable: boolean("is_available").default(true),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

// Product-related reference tables
export const refProductSizes = pgTable("ref_product_sizes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const refProductColors = pgTable("ref_product_colors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  hexCode: text("hex_code"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const refProductFeatures = pgTable("ref_product_features", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const refProductPerformance = pgTable("ref_product_performance", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const refProductThickness = pgTable("ref_product_thickness", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const refProductMaterials = pgTable("ref_product_materials", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const refDriveTypes = pgTable("ref_drive_types", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const refDimensionUnits = pgTable("ref_dimension_units", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  abbreviation: text("abbreviation").notNull(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const refWeightUnits = pgTable("ref_weight_units", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  abbreviation: text("abbreviation").notNull(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const refControlledItemTypes = pgTable("ref_controlled_item_types", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  description: text("description"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const refPricingTerms = pgTable("ref_pricing_terms", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const refManufacturingSources = pgTable("ref_manufacturing_sources", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  username: text("username").unique(),
  email: text("email").notNull().unique(),
  phone: text("phone").unique(),
  countryCode: text("country_code"),
  password: text("password"),
  firebaseUid: text("firebase_uid").unique(),
  userType: userTypeEnum("user_type").notNull().default('customer'),
  avatar: text("avatar"),
  emailVerified: boolean("email_verified").default(false),
  phoneVerified: boolean("phone_verified").default(false),
  completionPercentage: integer("completion_percentage").default(0),
  tokenVersion: integer("token_version").default(0),
  onboardingStep: integer("onboarding_step").default(0),
  isActive: boolean("is_active").default(true),
  suspendedAt: timestamp("suspended_at"),
  suspendedBy: varchar("suspended_by"),
  suspendedReason: text("suspended_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// OTP Verifications table for email/phone verification
export const otpVerifications = pgTable("otp_verifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  identifier: text("identifier").notNull(),
  code: text("code").notNull(),
  type: otpTypeEnum("type").notNull(),
  purpose: otpPurposeEnum("purpose").notNull().default('registration'),
  userId: varchar("user_id").references(() => users.id),
  attempts: integer("attempts").default(0),
  verified: boolean("verified").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Categories table
export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  image: text("image").notNull(),
  description: text("description"),
  parentId: integer("parent_id").references((): any => categories.id),
});

// Product status enum
export const productStatusEnum = pgEnum('product_status', ['draft', 'pending_review', 'approved', 'rejected', 'suspended']);

// Products table - Extended for multi-step product creation
export const products = pgTable("products", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  vendorId: varchar("vendor_id").references(() => users.id),
  status: productStatusEnum("status").notNull().default('draft'),
  
  // Tab 1: Basic Information
  name: text("name"),
  sku: text("sku"),
  mainCategoryId: integer("main_category_id").references(() => categories.id),
  categoryId: integer("category_id").references(() => categories.id),
  subCategoryId: integer("sub_category_id").references(() => categories.id),
  vehicleCompatibility: text("vehicle_compatibility"),
  certifications: text("certifications"),
  countryOfOrigin: text("country_of_origin"),
  controlledItemType: text("controlled_item_type"),
  
  // Tab 2: Technical Description - Specifications
  dimensionLength: decimal("dimension_length", { precision: 10, scale: 2 }),
  dimensionWidth: decimal("dimension_width", { precision: 10, scale: 2 }),
  dimensionHeight: decimal("dimension_height", { precision: 10, scale: 2 }),
  dimensionUnit: text("dimension_unit"),
  materials: text("materials").array(),
  features: text("features").array(),
  performance: text("performance").array(),
  technicalDescription: text("technical_description"),
  
  // Tab 2: Available Variants
  driveTypes: text("drive_types").array(),
  sizes: text("sizes").array(),
  thickness: text("thickness").array(),
  colors: text("colors").array(),
  weightValue: decimal("weight_value", { precision: 10, scale: 2 }),
  weightUnit: text("weight_unit"),
  packingLength: decimal("packing_length", { precision: 10, scale: 2 }),
  packingWidth: decimal("packing_width", { precision: 10, scale: 2 }),
  packingHeight: decimal("packing_height", { precision: 10, scale: 2 }),
  packingDimensionUnit: text("packing_dimension_unit"),
  packingWeight: decimal("packing_weight", { precision: 10, scale: 2 }),
  packingWeightUnit: text("packing_weight_unit"),
  minOrderQuantity: integer("min_order_quantity"),
  
  // Tab 3: Pricing & Availability
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
  currency: text("currency").default('USD'),
  pricingTerms: text("pricing_terms").array(),
  productionLeadTime: integer("production_lead_time"),
  readyStockAvailable: boolean("ready_stock_available").default(false),
  stock: integer("stock").default(0),
  
  // Tab 5: Compliance & Declarations
  manufacturingSource: text("manufacturing_source"),
  manufacturingSourceName: text("manufacturing_source_name"),
  requiresExportLicense: boolean("requires_export_license").default(false),
  hasWarranty: boolean("has_warranty").default(false),
  warrantyDuration: integer("warranty_duration"),
  warrantyDurationUnit: text("warranty_duration_unit"),
  warrantyTerms: text("warranty_terms"),
  complianceConfirmed: boolean("compliance_confirmed").default(false),
  supplierSignature: text("supplier_signature"),
  submissionDate: timestamp("submission_date"),
  
  // Legacy/computed fields
  price: decimal("price", { precision: 10, scale: 2 }),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  image: text("image"),
  gallery: text("gallery").array(),
  description: text("description"),
  condition: productConditionEnum("condition").default('new'),
  make: text("make"),
  model: text("model"),
  year: integer("year"),
  rating: decimal("rating", { precision: 2, scale: 1 }),
  reviewCount: integer("review_count").default(0),
  specifications: text("specifications"),
  vehicleFitment: text("vehicle_fitment"),
  warranty: text("warranty"),
  actionType: text("action_type").default('buy_now'),
  isFeatured: boolean("is_featured").default(false),
  isTopSelling: boolean("is_top_selling").default(false),
  
  // Admin review fields
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  rejectionReason: text("rejection_reason"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product Media table for images and files
export const productMedia = pgTable("product_media", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  type: text("type").notNull(),
  url: text("url").notNull(),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  isCover: boolean("is_cover").default(false),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Product Pricing Tiers for tiered pricing
export const productPricingTiers = pgTable("product_pricing_tiers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  minQuantity: integer("min_quantity").notNull(),
  maxQuantity: integer("max_quantity"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Product Review Notes table (admin feedback to sellers)
export const productReviewNotes = pgTable("product_review_notes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  adminId: varchar("admin_id", { length: 36 }).notNull().references(() => users.id),
  message: text("message").notNull(),
  requiresChanges: boolean("requires_changes").default(false),
  isVisibleToSeller: boolean("is_visible_to_seller").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Reviews table
export const reviews = pgTable("reviews", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  productId: integer("product_id").notNull().references(() => products.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  verifiedPurchase: boolean("verified_purchase").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Cart items table
export const cartItems = pgTable("cart_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: orderStatusEnum("status").notNull().default('pending'),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  trackingNumber: text("tracking_number"),
  estimatedDelivery: text("estimated_delivery"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Order items table
export const orderItems = pgTable("order_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  vendorId: varchar("vendor_id").references(() => users.id),
  name: text("name").notNull(),
  image: text("image").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
});

// Order status history table for tracking status changes
export const orderStatusHistory = pgTable("order_status_history", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  status: orderStatusEnum("status").notNull(),
  changedBy: varchar("changed_by").references(() => users.id),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Refund status enum (expanded for admin workflow)
export const refundRequestStatusEnum = pgEnum('refund_request_status', ['pending', 'under_review', 'approved', 'rejected', 'processing', 'completed', 'failed']);

// Refunds table
export const refunds = pgTable("refunds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  vendorId: varchar("vendor_id").references(() => users.id),
  status: refundStatusEnum("status").notNull().default('processing'),
  requestStatus: refundRequestStatusEnum("request_status").default('pending'),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  customerNote: text("customer_note"),
  paymentMethod: text("payment_method").notNull().default('Tamara'),
  triggerDate: timestamp("trigger_date").notNull().defaultNow(),
  estimatedCreditDate: timestamp("estimated_credit_date"),
  completedAt: timestamp("completed_at"),
  // Admin review fields
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  adminNote: text("admin_note"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Refund items table
export const refundItems = pgTable("refund_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  refundId: varchar("refund_id").notNull().references(() => refunds.id),
  productId: integer("product_id").notNull().references(() => products.id),
  name: text("name").notNull(),
  image: text("image").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
});

// Address type enum
export const addressTypeEnum = pgEnum('address_type', ['home', 'work', 'other']);

// User addresses table
export const addresses = pgTable("addresses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id),
  label: text("label").notNull(), // e.g., "Home", "Office", "Warehouse"
  addressType: addressTypeEnum("address_type").notNull().default('home'),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  addressLine1: text("address_line_1").notNull(),
  addressLine2: text("address_line_2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull(), // ISO country code
  isDefault: boolean("is_default").default(false),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Payment method type enum (regulatory compliant - no raw card data stored)
export const paymentMethodTypeEnum = pgEnum('payment_method_type', ['card', 'bank_account', 'upi', 'wallet']);

// Saved payment methods table (PCI-DSS, RBI, UAE Central Bank compliant)
// Only stores tokenized references from payment processors, never raw card numbers
export const savedPaymentMethods = pgTable("saved_payment_methods", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id),
  paymentMethodType: paymentMethodTypeEnum("payment_method_type").notNull(),
  // For cards: last 4 digits only (PCI-DSS compliant)
  lastFourDigits: text("last_four_digits"),
  // Card brand (visa, mastercard, amex, etc.)
  cardBrand: text("card_brand"),
  // Expiry month/year (for display only, actual validation done by payment processor)
  expiryMonth: integer("expiry_month"),
  expiryYear: integer("expiry_year"),
  // Cardholder name (can be stored as per PCI-DSS)
  cardholderName: text("cardholder_name"),
  // For bank accounts: masked account number
  maskedAccountNumber: text("masked_account_number"),
  // Bank name
  bankName: text("bank_name"),
  // For UPI: masked VPA (India specific - RBI compliant)
  maskedUpiId: text("masked_upi_id"),
  // Payment processor token (Stripe payment_method ID, etc.)
  // This is the only identifier used for transactions
  processorToken: text("processor_token").notNull(),
  // Payment processor name (stripe, razorpay, etc.)
  processorName: text("processor_name").notNull().default('stripe'),
  // Billing address reference
  billingAddressId: integer("billing_address_id").references(() => addresses.id),
  // Country for regulatory compliance (affects what data we can store)
  country: text("country").notNull(), // ISO country code
  // Is this the default payment method
  isDefault: boolean("is_default").default(false),
  // RBI mandate: explicit consent for card-on-file storage (India)
  hasRbiConsent: boolean("has_rbi_consent").default(false),
  // Consent timestamp (regulatory requirement)
  consentTimestamp: timestamp("consent_timestamp"),
  // Status
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Entity type enum for vendors
export const entityTypeEnum = pgEnum('entity_type', ['manufacturer', 'distributor', 'wholesaler', 'retailer', 'importer', 'exporter', 'other']);

// Vendor onboarding status enum
export const vendorOnboardingStatusEnum = pgEnum('vendor_onboarding_status', ['pending', 'in_progress', 'pending_verification', 'under_review', 'approved', 'rejected', 'suspended']);

// Type of buyer enum
export const typeOfBuyerEnum = pgEnum('type_of_buyer', ['individual', 'business', 'government', 'reseller', 'manufacturer', 'distributor', 'other']);
// Export values for use in APIs/UI without touching DB
export const TYPE_OF_BUYER_VALUES = ['individual', 'business', 'government', 'reseller', 'manufacturer', 'distributor', 'other'] as const;

// User Profiles table for supplier onboarding
export const userProfiles = pgTable("user_profiles", {  
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  
  // User type and compliance registration
  typeOfBuyer: typeOfBuyerEnum("type_of_buyer"),
  complianceRegistration: text("compliance_registration"),
  
  // Step 1: Store Details
  country: text("country"),
  companyName: text("company_name"),
  companyEmail: text("company_email"),
  companyPhone: text("company_phone"),
  companyPhoneCountryCode: text("company_phone_country_code"),
  
  // Step 2: Company Info
  countryOfRegistration: text("country_of_registration"),
  registeredCompanyName: text("registered_company_name"),
  tradeBrandName: text("trade_brand_name"),
  yearOfEstablishment: integer("year_of_establishment"),
  legalEntityId: text("legal_entity_id"),
  legalEntityIssueDate: text("legal_entity_issue_date"),
  legalEntityExpiryDate: text("legal_entity_expiry_date"),
  cityOfficeAddress: text("city_office_address"),
  officialWebsite: text("official_website"),
  entityType: entityTypeEnum("entity_type"),
  dunsNumber: text("duns_number"),
  vatCertificateUrl: text("vat_certificate_url"),
  taxVatNumber: text("tax_vat_number"),
  taxIssuingDate: text("tax_issuing_date"),
  taxExpiryDate: text("tax_expiry_date"),
  
  // Step 2: Authorized Contact Details
  contactFullName: text("contact_full_name"),
  contactJobTitle: text("contact_job_title"),
  contactWorkEmail: text("contact_work_email"),
  contactIdDocumentUrl: text("contact_id_document_url"),
  contactMobile: text("contact_mobile"),
  contactMobileCountryCode: text("contact_mobile_country_code"),
  termsAccepted: boolean("terms_accepted").default(false),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  
  // Step 3: Business & Compliance
  natureOfBusiness: text("nature_of_business").array(),
  controlledDualUseItems: text("controlled_dual_use_items"),
  licenseTypes: text("license_types").array(),
  endUseMarkets: text("end_use_markets").array(),
  operatingCountries: text("operating_countries").array(),
  isOnSanctionsList: boolean("is_on_sanctions_list").default(false),
  businessLicenseUrl: text("business_license_url"),
  defenseApprovalUrl: text("defense_approval_url"),
  companyProfileUrl: text("company_profile_url"),
  complianceTermsAccepted: boolean("compliance_terms_accepted").default(false),
  complianceTermsAcceptedAt: timestamp("compliance_terms_accepted_at"),
  
  // Step 4: Account Preferences
  sellingCategories: text("selling_categories").array(),
  registerAs: text("register_as").default("Verified Supplier"),
  preferredCurrency: text("preferred_currency"),
  sponsorContent: boolean("sponsor_content").default(false),
  
  // Step 5: Bank Details
  paymentMethod: text("payment_method"),
  bankCountry: text("bank_country"),
  financialInstitution: text("financial_institution"),
  swiftCode: text("swift_code"),
  bankAccountNumber: text("bank_account_number"),
  proofType: text("proof_type"),
  bankProofUrl: text("bank_proof_url"),
  
  // Commission Settings (overrides global default if set)
  commissionPercent: decimal("commission_percent", { precision: 5, scale: 2 }),
  
  // Identity Verification
  verificationMethod: text("verification_method"),
  submittedForApproval: boolean("submitted_for_approval").default(false),
  submittedAt: timestamp("submitted_at"),
  
  // Onboarding status
  onboardingStatus: vendorOnboardingStatusEnum("onboarding_status").default('pending'),
  currentStep: integer("current_step").default(1),
  completedAt: timestamp("completed_at"),
  
  // Admin review fields
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  rejectionReason: text("rejection_reason"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Admin action types enum
export const adminActionTypeEnum = pgEnum('admin_action_type', [
  'seller_approved', 'seller_rejected', 'seller_suspended', 'seller_activated',
  'product_approved', 'product_rejected', 'product_featured', 'product_unfeatured',
  'order_status_changed', 'refund_approved', 'refund_rejected',
  'user_suspended', 'user_activated', 'admin_created', 'settings_changed'
]);

// Platform settings table for global configurations
export const platformSettings = pgTable("platform_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Admin action logs table for audit trail
export const adminActionLogs = pgTable("admin_action_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  actionType: adminActionTypeEnum("action_type").notNull(),
  targetType: text("target_type").notNull(), // 'user', 'product', 'order', 'refund'
  targetId: varchar("target_id").notNull(),
  previousValue: text("previous_value"), // JSON string of previous state
  newValue: text("new_value"), // JSON string of new state
  note: text("note"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ===== SUPPORT TICKET SYSTEM =====
export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']);
export const ticketPriorityEnum = pgEnum('ticket_priority', ['low', 'medium', 'high', 'urgent']);

export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  customerId: varchar("customer_id").notNull().references(() => users.id),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  subject: text("subject").notNull(),
  status: ticketStatusEnum("status").notNull().default('open'),
  priority: ticketPriorityEnum("priority").notNull().default('medium'),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ticketMessages = pgTable("ticket_messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ticketId: varchar("ticket_id").notNull().references(() => supportTickets.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  senderType: text("sender_type").notNull(), // 'customer' or 'admin'
  message: text("message").notNull(),
  isInternal: boolean("is_internal").notNull().default(false), // Internal notes not visible to customer
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ticketAttachments = pgTable("ticket_attachments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  messageId: integer("message_id").notNull().references(() => ticketMessages.id),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Vendor notifications
export const vendorNotifications = pgTable("vendor_notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  type: text("type").notNull(), // order_new, order_status, refund_request, payout, approval, product_review
  title: text("title").notNull(),
  message: text("message").notNull(),
  orderId: varchar("order_id").references(() => orders.id),
  productId: integer("product_id").references(() => products.id),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Auth sessions table for JWT session management
export const authSessions = pgTable("auth_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  deviceLabel: text("device_label"),
  expiresAt: timestamp("expires_at").notNull(),
  lastUsedAt: timestamp("last_used_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  revokedAt: timestamp("revoked_at"),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  products: many(products),
  reviews: many(reviews),
  cartItems: many(cartItems),
  orders: many(orders),
  sessions: many(authSessions),
  addresses: many(addresses),
  savedPaymentMethods: many(savedPaymentMethods),
  userProfile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const addressesRelations = relations(addresses, ({ one, many }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
  paymentMethods: many(savedPaymentMethods),
}));

export const savedPaymentMethodsRelations = relations(savedPaymentMethods, ({ one }) => ({
  user: one(users, {
    fields: [savedPaymentMethods.userId],
    references: [users.id],
  }),
  billingAddress: one(addresses, {
    fields: [savedPaymentMethods.billingAddressId],
    references: [addresses.id],
  }),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id],
  }),
}));

export const adminActionLogsRelations = relations(adminActionLogs, ({ one }) => ({
  admin: one(users, {
    fields: [adminActionLogs.adminId],
    references: [users.id],
  }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  order: one(orders, {
    fields: [supportTickets.orderId],
    references: [orders.id],
  }),
  customer: one(users, {
    fields: [supportTickets.customerId],
    references: [users.id],
    relationName: 'ticketCustomer',
  }),
  assignedTo: one(users, {
    fields: [supportTickets.assignedToId],
    references: [users.id],
    relationName: 'ticketAssignee',
  }),
  messages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one, many }) => ({
  ticket: one(supportTickets, {
    fields: [ticketMessages.ticketId],
    references: [supportTickets.id],
  }),
  sender: one(users, {
    fields: [ticketMessages.senderId],
    references: [users.id],
  }),
  attachments: many(ticketAttachments),
}));

export const ticketAttachmentsRelations = relations(ticketAttachments, ({ one }) => ({
  message: one(ticketMessages, {
    fields: [ticketAttachments.messageId],
    references: [ticketMessages.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  products: many(products),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categoryHierarchy',
  }),
  children: many(categories, {
    relationName: 'categoryHierarchy',
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  mainCategory: one(categories, {
    fields: [products.mainCategoryId],
    references: [categories.id],
    relationName: 'mainCategory',
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
    relationName: 'category',
  }),
  subCategory: one(categories, {
    fields: [products.subCategoryId],
    references: [categories.id],
    relationName: 'subCategory',
  }),
  vendor: one(users, {
    fields: [products.vendorId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [products.reviewedBy],
    references: [users.id],
    relationName: 'productReviewer',
  }),
  reviews: many(reviews),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
  media: many(productMedia),
  pricingTiers: many(productPricingTiers),
}));

export const productMediaRelations = relations(productMedia, ({ one }) => ({
  product: one(products, {
    fields: [productMedia.productId],
    references: [products.id],
  }),
}));

export const productPricingTiersRelations = relations(productPricingTiers, ({ one }) => ({
  product: one(products, {
    fields: [productPricingTiers.productId],
    references: [products.id],
  }),
}));

export const productReviewNotesRelations = relations(productReviewNotes, ({ one }) => ({
  product: one(products, {
    fields: [productReviewNotes.productId],
    references: [products.id],
  }),
  admin: one(users, {
    fields: [productReviewNotes.adminId],
    references: [users.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  vendor: one(users, {
    fields: [orderItems.vendorId],
    references: [users.id],
  }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
  changedByUser: one(users, {
    fields: [orderStatusHistory.changedBy],
    references: [users.id],
  }),
}));

export const refundsRelations = relations(refunds, ({ one, many }) => ({
  order: one(orders, {
    fields: [refunds.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [refunds.userId],
    references: [users.id],
  }),
  items: many(refundItems),
}));

export const refundItemsRelations = relations(refundItems, ({ one }) => ({
  refund: one(refunds, {
    fields: [refundItems.refundId],
    references: [refunds.id],
  }),
  product: one(products, {
    fields: [refundItems.productId],
    references: [products.id],
  }),
}));

export const otpVerificationsRelations = relations(otpVerifications, ({ one }) => ({
  user: one(users, {
    fields: [otpVerifications.userId],
    references: [users.id],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  password: z.string().min(6).optional(),
}).omit({
  id: true,
  createdAt: true,
  completionPercentage: true,
  emailVerified: true,
  phoneVerified: true,
  onboardingStep: true,
});

export const insertOtpVerificationSchema = createInsertSchema(otpVerifications).omit({
  id: true,
  createdAt: true,
  attempts: true,
  verified: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  rating: true,
  reviewCount: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNote: true,
  rejectionReason: true,
});

export const insertProductMediaSchema = createInsertSchema(productMedia).omit({
  id: true,
  createdAt: true,
});

export const insertProductPricingTierSchema = createInsertSchema(productPricingTiers).omit({
  id: true,
  createdAt: true,
});

export const insertProductReviewNoteSchema = createInsertSchema(productReviewNotes).omit({
  id: true,
  createdAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export const insertOrderStatusHistorySchema = createInsertSchema(orderStatusHistory).omit({
  id: true,
  createdAt: true,
});

export const insertAuthSessionSchema = createInsertSchema(authSessions).omit({
  id: true,
  lastUsedAt: true,
  createdAt: true,
  revokedAt: true,
});

export const insertRefundSchema = createInsertSchema(refunds).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertRefundItemSchema = createInsertSchema(refundItems).omit({
  id: true,
});

export const insertAddressSchema = createInsertSchema(addresses).omit({
  id: true,
  createdAt: true,
  isVerified: true,
});

export const insertSavedPaymentMethodSchema = createInsertSchema(savedPaymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  termsAcceptedAt: true,
});

export const insertAdminActionLogSchema = createInsertSchema(adminActionLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  closedAt: true,
});

export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({
  id: true,
  createdAt: true,
});

export const insertTicketAttachmentSchema = createInsertSchema(ticketAttachments).omit({
  id: true,
  createdAt: true,
});

export const insertVendorNotificationSchema = createInsertSchema(vendorNotifications).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type ProductMedia = typeof productMedia.$inferSelect;
export type InsertProductMedia = z.infer<typeof insertProductMediaSchema>;

export type ProductPricingTier = typeof productPricingTiers.$inferSelect;
export type InsertProductPricingTier = z.infer<typeof insertProductPricingTierSchema>;

export type ProductReviewNote = typeof productReviewNotes.$inferSelect;
export type InsertProductReviewNote = z.infer<typeof insertProductReviewNoteSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type InsertOrderStatusHistory = z.infer<typeof insertOrderStatusHistorySchema>;

export type AuthSession = typeof authSessions.$inferSelect;
export type InsertAuthSession = z.infer<typeof insertAuthSessionSchema>;

export type Refund = typeof refunds.$inferSelect;
export type InsertRefund = z.infer<typeof insertRefundSchema>;

export type RefundItem = typeof refundItems.$inferSelect;
export type InsertRefundItem = z.infer<typeof insertRefundItemSchema>;

export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;

export type SavedPaymentMethod = typeof savedPaymentMethods.$inferSelect;
export type InsertSavedPaymentMethod = z.infer<typeof insertSavedPaymentMethodSchema>;

export type OtpVerification = typeof otpVerifications.$inferSelect;
export type InsertOtpVerification = z.infer<typeof insertOtpVerificationSchema>;

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export type AdminActionLog = typeof adminActionLogs.$inferSelect;
export type InsertAdminActionLog = z.infer<typeof insertAdminActionLogSchema>;

export type PlatformSetting = typeof platformSettings.$inferSelect;

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

export type TicketMessage = typeof ticketMessages.$inferSelect;
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;

export type TicketAttachment = typeof ticketAttachments.$inferSelect;
export type InsertTicketAttachment = z.infer<typeof insertTicketAttachmentSchema>;

export type VendorNotification = typeof vendorNotifications.$inferSelect;
export type InsertVendorNotification = z.infer<typeof insertVendorNotificationSchema>;
