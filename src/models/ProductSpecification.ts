import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Product Specification Types
 * - general: Shows both label and value columns
 * - title_only: Merges columns, displays as bold title
 * - value_only: Merges columns, displays as regular text
 */
export const SpecificationType = {
	GENERAL: 'general',
	TITLE_ONLY: 'title_only',
	VALUE_ONLY: 'value_only',
} as const;

interface ProductSpecificationAttributes {
	id: string;
	product_id: string;
	label?: string | null;
	value?: string | null;
	type: 'general' | 'title_only' | 'value_only';
	active: boolean;
	sort: number;
	created_at?: Date;
	updated_at?: Date;
}

interface ProductSpecificationCreationAttributes extends Optional<ProductSpecificationAttributes, 'id' | 'label' | 'value' | 'type' | 'active' | 'sort' | 'created_at' | 'updated_at'> { }

export class ProductSpecification extends Model<ProductSpecificationAttributes, ProductSpecificationCreationAttributes> implements ProductSpecificationAttributes {
	declare public id: string;
	declare public product_id: string;
	declare public label?: string | null;
	declare public value?: string | null;
	declare public type: 'general' | 'title_only' | 'value_only';
	declare public active: boolean;
	declare public sort: number;
	declare public readonly created_at: Date;
	declare public readonly updated_at: Date;
}

ProductSpecification.init(
	{
		id: {
			type: DataTypes.UUID,
			defaultValue: DataTypes.UUIDV4,
			primaryKey: true,
		},
		product_id: {
			type: DataTypes.UUID,
			allowNull: false,
			references: {
				model: 'products',
				key: 'id',
			},
			onDelete: 'CASCADE',
		},
		label: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		value: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		type: {
			type: DataTypes.ENUM('general', 'title_only', 'value_only'),
			allowNull: false,
			defaultValue: 'general',
		},
		active: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: true,
		},
		sort: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		created_at: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW,
		},
		updated_at: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW,
		},
	},
	{
		sequelize,
		tableName: 'product_specifications',
		timestamps: true,
		createdAt: 'created_at',
		updatedAt: 'updated_at',
		paranoid: false,
	}
);
