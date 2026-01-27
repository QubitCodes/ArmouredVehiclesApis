import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { Product } from './Product';

// --- Wishlist ---
interface WishlistAttributes {
  id: string; // UUID
  user_id?: string | null;
  session_id?: string | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
  delete_reason?: string | null;
}

interface WishlistCreationAttributes extends Optional<WishlistAttributes, 'id'> {}

export class Wishlist extends Model<WishlistAttributes, WishlistCreationAttributes> implements WishlistAttributes {
  declare id: string;
  declare user_id: string | null;
  declare session_id: string | null;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
  declare delete_reason: string | null;

  public items?: WishlistItem[];
}

Wishlist.init(
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
    tableName: 'wishlists',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
  }
);

// --- Wishlist Item ---
interface WishlistItemAttributes {
  id: string; // UUID
  wishlist_id: string;
  product_id: number;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
  delete_reason?: string | null;
}

interface WishlistItemCreationAttributes extends Optional<WishlistItemAttributes, 'id'> {}

export class WishlistItem extends Model<WishlistItemAttributes, WishlistItemCreationAttributes> implements WishlistItemAttributes {
  declare id: string;
  declare wishlist_id: string;
  declare product_id: number;
  declare created_at: Date;
  declare updated_at: Date;
  declare deleted_at: Date | null;
  declare delete_reason: string | null;
  
  public readonly product?: Product;
}

WishlistItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    wishlist_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
    tableName: 'wishlist_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
  }
);
