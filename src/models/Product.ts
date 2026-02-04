import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { getFileUrl } from '../utils/fileUrl';
import { RefProductBrand } from './RefProductBrand';

// Enums
export const ProductStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
};

export const ProductCondition = {
  NEW: 'new',
  USED: 'used',
  REFURBISHED: 'refurbished',
};

// --- Product Attribute Interface ---
interface ProductAttributes {
  id: string; // UUID
  vendor_id?: string;
  status: string;

  // Basic
  name?: string;
  sku?: string | null;
  main_category_id?: number | null;
  category_id?: number | null;
  sub_category_id?: number | null;
  vehicle_compatibility?: string | null;
  certifications?: string[] | null;
  country_of_origin?: string | null;
  controlled_item_type?: string | null;

  // Specs
  dimension_length?: number | null;
  dimension_width?: number | null;
  dimension_height?: number | null;
  dimension_unit?: string | null;
  materials?: string[] | null;
  features?: string[] | null;
  performance?: string[] | null;
  technical_description?: string | null;

  // Variants
  drive_types?: string[] | null;
  sizes?: string[] | null;
  thickness?: string[] | null;
  colors?: string[] | null;
  weight_value?: number | null;
  weight_unit?: string | null;

  // Packing
  packing_length?: number | null;
  packing_width?: number | null;
  packing_height?: number | null;
  packing_dimension_unit?: string | null;
  packing_weight?: number | null;
  packing_weight_unit?: string | null;
  min_order_quantity?: number | null;

  // Pricing & Stock
  base_price?: number | null;
  shipping_charge?: number | null;
  packing_charge?: number | null;
  currency?: string | null;
  pricing_terms?: string[] | null;
  production_lead_time?: number | null;
  ready_stock_available?: boolean | null;
  stock?: number | null;

  // Compliance
  manufacturing_source?: string | null;
  manufacturing_source_name?: string | null;
  requires_export_license?: boolean | null;
  has_warranty?: boolean | null;
  warranty_duration?: number | null;
  warranty_duration_unit?: string | null;
  warranty_terms?: string | null;
  compliance_confirmed?: boolean | null;
  supplier_signature?: string | null;
  submission_date?: Date | null;

  // Legacy/Computed
  price?: number | null;
  original_price?: number | null;

  description?: string | null;
  condition?: string | null;
  brand_id?: number | null;
  model?: string | null;
  year?: number | null;
  rating?: number | null;
  review_count?: number | null;
  specifications?: string | null;
  vehicle_fitment?: string | null;
  warranty?: string | null; // Legacy text field
  action_type?: string | null;
  is_featured?: boolean | null;
  is_top_selling?: boolean | null;

  // Admin
  reviewed_by?: string | null;
  reviewed_at?: Date | null;
  review_note?: string | null;
  rejection_reason?: string | null;
  approval_status?: 'pending' | 'approved' | 'rejected' | null;
  commission?: number;

  individual_product_pricing?: { name: string; amount: number }[] | null;

  created_at?: Date;
  updated_at?: Date;
}

interface ProductCreationAttributes extends Optional<ProductAttributes, 'id' | 'status' | 'created_at' | 'updated_at'> { }

export class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
  declare public id: string;
  declare public vendor_id?: string;
  declare public status: string;
  declare public approval_status?: 'pending' | 'approved' | 'rejected';
  declare public rejection_reason?: string;

  // Associations
  declare public vendor?: any;
  declare public category?: any;
  declare public main_category?: any;
  declare public sub_category?: any;
  declare public brand?: RefProductBrand;
  declare public media?: ProductMedia[];
  declare public pricing_tiers?: any[];
  declare public product_specifications?: any[];

  // Basic
  declare public name?: string;
  declare public sku?: string;
  declare public main_category_id?: number;
  declare public category_id?: number;
  declare public sub_category_id?: number;
  declare public vehicle_compatibility?: string;
  declare public certifications?: string[];
  declare public country_of_origin?: string;
  declare public controlled_item_type?: string;

  // Specs
  declare public dimension_length?: number;
  declare public dimension_width?: number;
  declare public dimension_height?: number;
  declare public dimension_unit?: string;
  declare public materials?: string[];
  declare public features?: string[];
  declare public performance?: string[];
  declare public technical_description?: string;

  // Variants
  declare public drive_types?: string[];
  declare public sizes?: string[];
  declare public thickness?: string[];
  declare public colors?: string[];
  declare public weight_value?: number;
  declare public weight_unit?: string;

  // Packing
  declare public packing_length?: number;
  declare public packing_width?: number;
  declare public packing_height?: number;
  declare public packing_dimension_unit?: string;
  declare public packing_weight?: number;
  declare public packing_weight_unit?: string;
  declare public min_order_quantity?: number;

  // Pricing
  declare public base_price?: number;
  declare public shipping_charge?: number;
  declare public packing_charge?: number;
  declare public currency?: string;
  declare public pricing_terms?: string[];
  declare public production_lead_time?: number;
  declare public ready_stock_available?: boolean;
  declare public stock?: number;

  // Compliance
  declare public manufacturing_source?: string;
  declare public manufacturing_source_name?: string;
  declare public requires_export_license?: boolean;
  declare public has_warranty?: boolean;
  declare public warranty_duration?: number;
  declare public warranty_duration_unit?: string;
  declare public warranty_terms?: string;
  declare public compliance_confirmed?: boolean;
  declare public supplier_signature?: string;
  declare public submission_date?: Date;

  // Legacy
  declare public price?: number;
  declare public original_price?: number;

  declare public description?: string;
  declare public condition?: string;
  declare public brand_id?: number;
  declare public model?: string;
  declare public year?: number;
  declare public rating?: number;
  declare public review_count?: number;
  declare public specifications?: string;
  declare public vehicle_fitment?: string;
  declare public warranty?: string;
  declare public action_type?: string;
  declare public is_featured?: boolean;
  declare public is_top_selling?: boolean;

  // Admin
  declare public reviewed_by?: string;
  declare public reviewed_at?: Date;
  declare public review_note?: string;

  declare public individual_product_pricing?: { name: string; amount: number }[];
  declare public commission?: number;

  declare public readonly created_at: Date;
  declare public readonly updated_at: Date;
}

Product.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    vendor_id: { type: DataTypes.UUID },
    status: { type: DataTypes.STRING, defaultValue: ProductStatus.DRAFT },
    approval_status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },

    name: { type: DataTypes.TEXT },
    sku: { type: DataTypes.TEXT },
    main_category_id: { type: DataTypes.INTEGER },
    category_id: { type: DataTypes.INTEGER },
    sub_category_id: { type: DataTypes.INTEGER },
    vehicle_compatibility: { type: DataTypes.TEXT },
    certifications: { type: DataTypes.JSONB, defaultValue: [] },
    country_of_origin: { type: DataTypes.TEXT },
    controlled_item_type: { type: DataTypes.TEXT },

    // Specs
    dimension_length: { type: DataTypes.DECIMAL(10, 2) },
    dimension_width: { type: DataTypes.DECIMAL(10, 2) },
    dimension_height: { type: DataTypes.DECIMAL(10, 2) },
    dimension_unit: { type: DataTypes.TEXT },
    materials: { type: DataTypes.ARRAY(DataTypes.TEXT) },
    features: { type: DataTypes.ARRAY(DataTypes.TEXT) },
    performance: { type: DataTypes.ARRAY(DataTypes.TEXT) },
    technical_description: { type: DataTypes.TEXT },

    // Variants
    drive_types: { type: DataTypes.ARRAY(DataTypes.TEXT) },
    sizes: { type: DataTypes.ARRAY(DataTypes.TEXT) },
    thickness: { type: DataTypes.ARRAY(DataTypes.TEXT) },
    colors: { type: DataTypes.ARRAY(DataTypes.TEXT) },
    weight_value: { type: DataTypes.DECIMAL(10, 2) },
    weight_unit: { type: DataTypes.TEXT },

    // Packing
    packing_length: { type: DataTypes.DECIMAL(10, 2) },
    packing_width: { type: DataTypes.DECIMAL(10, 2) },
    packing_height: { type: DataTypes.DECIMAL(10, 2) },
    packing_dimension_unit: { type: DataTypes.TEXT },
    packing_weight: { type: DataTypes.DECIMAL(10, 2) },
    packing_weight_unit: { type: DataTypes.TEXT },
    min_order_quantity: { type: DataTypes.INTEGER },

    // Pricing & Stock
    base_price: { type: DataTypes.DECIMAL(10, 2) },
    shipping_charge: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    packing_charge: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    currency: { type: DataTypes.TEXT, defaultValue: 'AED' },
    pricing_terms: { type: DataTypes.ARRAY(DataTypes.TEXT) },
    production_lead_time: { type: DataTypes.INTEGER },
    ready_stock_available: { type: DataTypes.BOOLEAN, defaultValue: false },
    stock: { type: DataTypes.INTEGER, defaultValue: 0 },

    // Compliance
    manufacturing_source: { type: DataTypes.TEXT },
    manufacturing_source_name: { type: DataTypes.TEXT },
    requires_export_license: { type: DataTypes.BOOLEAN, defaultValue: false },
    has_warranty: { type: DataTypes.BOOLEAN, defaultValue: false },
    warranty_duration: { type: DataTypes.INTEGER },
    warranty_duration_unit: { type: DataTypes.TEXT },
    warranty_terms: { type: DataTypes.TEXT },
    compliance_confirmed: { type: DataTypes.BOOLEAN, defaultValue: false },
    supplier_signature: { type: DataTypes.TEXT },
    submission_date: { type: DataTypes.DATE },

    // Legacy/Computed
    price: { type: DataTypes.DECIMAL(10, 2) },
    original_price: { type: DataTypes.DECIMAL(10, 2) },


    // Additional Legacy
    description: { type: DataTypes.TEXT },
    condition: { type: DataTypes.STRING, defaultValue: ProductCondition.NEW },
    brand_id: { type: DataTypes.INTEGER },
    model: { type: DataTypes.TEXT },
    year: { type: DataTypes.INTEGER },
    rating: { type: DataTypes.DECIMAL(3, 2) },
    review_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    specifications: { type: DataTypes.TEXT },
    vehicle_fitment: { type: DataTypes.TEXT },
    warranty: { type: DataTypes.TEXT }, // Legacy field name
    action_type: { type: DataTypes.TEXT, defaultValue: 'buy_now' },
    is_featured: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_top_selling: { type: DataTypes.BOOLEAN, defaultValue: false },

    // Admin
    reviewed_by: { type: DataTypes.STRING },
    reviewed_at: { type: DataTypes.DATE },
    review_note: { type: DataTypes.TEXT },

    individual_product_pricing: { type: DataTypes.JSONB, defaultValue: [] },
    commission: { type: DataTypes.INTEGER, defaultValue: 0 },

    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'products',
    timestamps: true,

    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);


// --- Product Media ---
interface ProductMediaAttributes {
  id: number;
  product_id: string;
  type: string;
  url: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  is_cover?: boolean;
  display_order?: number;
  created_at?: Date;
}
interface ProductMediaCreationAttributes extends Optional<ProductMediaAttributes, 'id' | 'created_at'> { }

export class ProductMedia extends Model<ProductMediaAttributes, ProductMediaCreationAttributes> implements ProductMediaAttributes {
  declare public id: number;
  declare public product_id: string;
  declare public type: string;
  declare public url: string;
  declare public file_name?: string;
  declare public file_size?: number;
  declare public mime_type?: string;
  declare public is_cover?: boolean;
  declare public display_order?: number;
  declare public readonly created_at: Date;
}

ProductMedia.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    product_id: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.TEXT, allowNull: false }, // 'image', 'video', 'document'
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const rawValue = this.getDataValue('url');
        return getFileUrl(rawValue);
      }
    },
    file_name: { type: DataTypes.TEXT },
    file_size: { type: DataTypes.INTEGER },
    mime_type: { type: DataTypes.TEXT },
    is_cover: { type: DataTypes.BOOLEAN, defaultValue: false },
    display_order: { type: DataTypes.INTEGER, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'product_media',
    timestamps: true,

    createdAt: 'created_at',
    updatedAt: false,
  }
);


// --- Product Pricing Tiers ---
interface ProductPricingTierAttributes {
  id: number;
  product_id: string;
  min_quantity: number;
  max_quantity?: number | null;
  price: number;
  created_at?: Date;
  deleted_at?: Date | null;
  delete_reason?: string | null;
}
interface ProductPricingTierCreationAttributes extends Optional<ProductPricingTierAttributes, 'id' | 'created_at' | 'deleted_at' | 'delete_reason'> { }

export class ProductPricingTier extends Model<ProductPricingTierAttributes, ProductPricingTierCreationAttributes> implements ProductPricingTierAttributes {
  declare public id: number;
  declare public product_id: string;
  declare public min_quantity: number;
  declare public max_quantity?: number | null;
  declare public price: number;
  declare public readonly created_at: Date;
  declare public readonly deleted_at?: Date | null;
  declare public delete_reason?: string | null;
}

ProductPricingTier.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    product_id: { type: DataTypes.UUID, allowNull: false },
    min_quantity: { type: DataTypes.INTEGER, allowNull: false },
    max_quantity: { type: DataTypes.INTEGER },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deleted_at: { type: DataTypes.DATE },
    delete_reason: { type: DataTypes.STRING },
  },
  {
    sequelize,
    tableName: 'product_pricing_tiers',
    timestamps: true,
    paranoid: true,

    createdAt: 'created_at',
    updatedAt: false,
    deletedAt: 'deleted_at',
  }
);
