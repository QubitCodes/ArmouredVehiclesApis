import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';
import { Product } from './Product';

// --- Order ---
interface OrderAttributes {
  id: string; // UUID
  order_id?: string | null; // 8 digit number
  user_id: string;
  order_status: 'order_received' | 'vendor_approved' | 'vendor_rejected' | 'pending_review' | 'pending_approval' | 'rejected' | 'approved' | 'cancelled';
  total_amount: number;
  currency: string;
  type: 'direct' | 'request';
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | null;
  shipment_status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'returned' | 'cancelled' | null;
  comments?: string | null;
  tracking_number?: string | null;
  shipment_id?: string | null;
  label_url?: string | null;
  transaction_details?: object | null;
  shipment_details?: object | null;
  status_history?: object[] | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
  order_group_id?: string | null;
  vendor_id?: string | null;
  vat_amount?: number;
  admin_commission?: number;
  total_shipping?: number;
  total_packing?: number;
}


interface OrderCreationAttributes extends Optional<OrderAttributes, 'id' | 'order_id' | 'order_status' | 'currency' | 'payment_status' | 'shipment_status' | 'transaction_details' | 'shipment_details'> { }

export class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
  declare public id: string;
  declare public order_id?: string | null;
  declare public user_id: string;
  declare public order_status: 'order_received' | 'vendor_approved' | 'vendor_rejected' | 'approved' | 'rejected' | 'cancelled';
  declare public total_amount: number;
  declare public currency: string;
  declare public type: 'direct' | 'request';
  declare public payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | null;
  declare public shipment_status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'returned' | 'cancelled' | null;
  declare public comments?: string | null;
  declare public tracking_number?: string | null;
  declare public shipment_id?: string | null;
  declare public label_url?: string | null;
  declare public transaction_details?: object | null;
  declare public shipment_details?: object | null;
  declare public status_history?: object[] | null;
  declare public created_at: Date;
  declare public updated_at: Date;
  declare public deleted_at: Date | null;
  declare public order_group_id?: string | null;
  declare public vendor_id?: string | null;
  declare public vat_amount: number;
  declare public admin_commission: number;
  declare public total_shipping: number;
  declare public total_packing: number;

  public items?: OrderItem[];
  public user?: User;
}

Order.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    order_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    order_status: {
      type: DataTypes.ENUM('order_received', 'vendor_approved', 'vendor_rejected', 'approved', 'rejected', 'cancelled'),
      defaultValue: 'order_received',
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'AED',
    },
    type: {
      type: DataTypes.ENUM('direct', 'request'),
      allowNull: false,
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
      allowNull: true,
      defaultValue: null,
    },
    shipment_status: {
      type: DataTypes.ENUM('pending', 'vendor_shipped', 'admin_received', 'processing', 'shipped', 'delivered', 'returned', 'cancelled'),
      allowNull: true,
      defaultValue: null,
    },
    comments: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tracking_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    shipment_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    label_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    transaction_details: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    shipment_details: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    status_history: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    order_group_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    vendor_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    vat_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
    },
    admin_commission: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
    },
    total_shipping: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
    },
    total_packing: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

// --- Order Item ---
interface OrderItemAttributes {
  id: string; // UUID
  order_id: string;
  product_id: number;
  vendor_id?: string | null;
  quantity: number;
  price: number;
  product_name: string; // Snapshot
  created_at?: Date;
  updated_at?: Date;
}

interface OrderItemCreationAttributes extends Optional<OrderItemAttributes, 'id'> { }

export class OrderItem extends Model<OrderItemAttributes, OrderItemCreationAttributes> implements OrderItemAttributes {
  public id!: string;
  public order_id!: string;
  public product_id!: number;
  public vendor_id?: string | null;
  public quantity!: number;
  public price!: number;
  public product_name!: string;

  public readonly product?: Product;
}

OrderItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    vendor_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    product_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'order_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);
