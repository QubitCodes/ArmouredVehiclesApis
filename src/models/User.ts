import { DataTypes, Model, type Optional } from 'sequelize';
import { sequelize } from '../config/database';
import { UserProfile } from './UserProfile';

interface UserAttributes {
  id: string;
  name: string;
  username?: string;
  email: string;
  phone?: string;
  country_code?: string;
  password?: string;
  firebase_uid?: string;
  user_type: 'customer' | 'vendor' | 'admin' | 'super_admin';
  avatar?: string;
  email_verified: boolean;
  phone_verified: boolean;
  completion_percentage: number;
  token_version: number;
  onboarding_step: number | null;
  is_active: boolean;
  suspended_at?: Date | null;
  suspended_by?: string;
  suspended_reason?: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date;
}

// We recommend optional attributes for creation
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'user_type' | 'email_verified' | 'phone_verified' | 'completion_percentage' | 'token_version' | 'onboarding_step' | 'is_active'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public declare id: string;
  public declare name: string;
  public declare username: string;
  public declare email: string;
  public declare phone: string;
  public declare country_code: string;
  public declare password: string;
  public declare firebase_uid: string;
  public declare user_type: 'customer' | 'vendor' | 'admin' | 'super_admin';
  public declare avatar: string;
  public declare email_verified: boolean;
  public declare phone_verified: boolean;
  public declare completion_percentage: number;
  public declare token_version: number;
  public declare onboarding_step: number | null;
  public declare is_active: boolean;
  public declare suspended_at: Date | null;
  public declare suspended_by: string;
  public declare suspended_reason: string;
  
  public declare readonly created_at: Date;
  public declare readonly updated_at: Date;
  public declare readonly deleted_at: Date;

  public declare readonly profile?: UserProfile;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    username: {
      type: DataTypes.TEXT,
      unique: true,
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.TEXT,
      unique: true,
    },
    country_code: {
      type: DataTypes.TEXT,
    },
    password: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    firebase_uid: {
      type: DataTypes.TEXT,
      unique: true,
    },
    user_type: {
      type: DataTypes.ENUM('customer', 'vendor', 'admin', 'super_admin'),
      allowNull: false,
      defaultValue: 'customer',
    },
    avatar: {
      type: DataTypes.TEXT,
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    phone_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    completion_percentage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    token_version: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    onboarding_step: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    suspended_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    suspended_by: {
      type: DataTypes.STRING,
    },
    suspended_reason: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    tableName: 'users',
    modelName: 'User',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true, // soft deletes enabled
  }
);
