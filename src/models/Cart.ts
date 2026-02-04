import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { Product } from './Product';

// --- Cart ---
interface CartAttributes {
  id: string; // UUID
  user_id?: string | null;
  session_id?: string | null; // For guest carts
  status: 'active' | 'abandoned' | 'converted';
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
  delete_reason?: string | null;
}

interface CartCreationAttributes extends Optional<CartAttributes, 'id' | 'status'> { }

export class Cart extends Model<CartAttributes, CartCreationAttributes> implements CartAttributes {
  declare id: string;
  declare user_id: string | null;
  declare session_id: string | null;
  declare status: 'active' | 'abandoned' | 'converted';
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
  declare delete_reason: string | null;

  declare public items?: CartItem[];
}

Cart.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    session_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'abandoned', 'converted'),
      defaultValue: 'active',
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    delete_reason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'carts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
  }
);

// --- Cart Item ---
interface CartItemAttributes {
  id: string; // UUID
  cart_id: string;
  product_id: string;
  quantity: number;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
  delete_reason?: string | null;
}

interface CartItemCreationAttributes extends Optional<CartItemAttributes, 'id'> { }

export class CartItem extends Model<CartItemAttributes, CartItemCreationAttributes> implements CartItemAttributes {
  declare id: string;
  declare cart_id: string;
  declare product_id: string;
  declare quantity: number;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
  declare delete_reason: string | null;

  declare public readonly product?: Product;
}

CartItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    cart_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    delete_reason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'cart_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
  }
);
