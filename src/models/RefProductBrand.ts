import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface RefProductBrandAttributes {
  id: number;
  name: string;
  slug?: string;
  icon?: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

interface RefProductBrandCreationAttributes extends Optional<RefProductBrandAttributes, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> {}

export class RefProductBrand extends Model<RefProductBrandAttributes, RefProductBrandCreationAttributes> implements RefProductBrandAttributes {
  declare public id: number;
  declare public name: string;
  declare public slug?: string;
  declare public icon?: string;
  declare public readonly created_at: Date;
  declare public readonly updated_at: Date;
  declare public readonly deleted_at: Date | null;
}

RefProductBrand.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    slug: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    icon: {
        type: DataTypes.STRING,
        allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'ref_product_brands',
    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  }
);
