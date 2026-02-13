import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { getFileUrl } from '../utils/fileUrl';

interface CategoryAttributes {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  description?: string | null;
  is_controlled: boolean;
  is_active: boolean;
  parent_id?: number | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

interface CategoryCreationAttributes extends Optional<CategoryAttributes, 'id' | 'image' | 'is_active' | 'created_at' | 'updated_at' | 'deleted_at'> { }

export class Category extends Model<CategoryAttributes, CategoryCreationAttributes> implements CategoryAttributes {
  public id!: number;
  public name!: string;
  public slug!: string;
  public image?: string | null;
  public description?: string | null;
  public parent_id?: number | null;
  public is_controlled!: boolean;
  public is_active!: boolean;

  public readonly created_at?: Date;
  public readonly updated_at?: Date;
  public readonly deleted_at?: Date | null;

  public readonly parent?: Category;
  public readonly children?: Category[];
}

Category.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    image: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('image');
        return getFileUrl(rawValue);
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_controlled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id',
      },
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
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'categories',
    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  }
);

// Self-referential association to be defined in models/index.ts to avoid circular deps if possible,
// or here if standard. Usually models/index.ts is safer for associations.

