import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Address Model
 * Stores user shipping/billing addresses
 */

interface AddressAttributes {
	id: string;
	user_id: string;
	label: string;
	full_name: string;
	phone: string;
	phone_country_code?: string;
	address_line1: string;
	address_line2?: string;
	city: string;
	state?: string;
	postal_code: string;
	country: string;
	is_default: boolean;
	created_at?: Date;
	updated_at?: Date;
}

interface AddressCreationAttributes extends Optional<AddressAttributes, 'id' | 'is_default' | 'created_at' | 'updated_at'> {}

export class Address extends Model<AddressAttributes, AddressCreationAttributes> implements AddressAttributes {
	declare id: string;
	declare user_id: string;
	declare label: string;
	declare full_name: string;
	declare phone: string;
	declare phone_country_code?: string;
	declare address_line1: string;
	declare address_line2?: string;
	declare city: string;
	declare state?: string;
	declare postal_code: string;
	declare country: string;
	declare is_default: boolean;

	declare created_at: Date;
	declare updated_at: Date;
}

Address.init(
	{
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		user_id: {
			type: DataTypes.UUID,
			allowNull: false,
		},
		label: {
			type: DataTypes.TEXT,
			allowNull: false,
			defaultValue: 'Home',
		},
		full_name: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		phone: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		phone_country_code: {
			type: DataTypes.TEXT,
		},
		address_line1: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		address_line2: {
			type: DataTypes.TEXT,
		},
		city: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		state: {
			type: DataTypes.TEXT,
		},
		postal_code: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		country: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		is_default: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
	},
	{
		sequelize,
		tableName: 'addresses',
		underscored: true,
		timestamps: true,
		createdAt: 'created_at',
		updatedAt: 'updated_at',
		paranoid: false,
	}
);
