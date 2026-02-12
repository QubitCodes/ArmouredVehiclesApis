
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface RefShippingTypeAttributes {
    id: number;
    name: string;
    service_type: string;
    display_order: number;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
    delete_reason?: string;
}

interface RefShippingTypeCreationAttributes extends Optional<RefShippingTypeAttributes, 'id' | 'created_at' | 'updated_at'> { }

export class RefShippingType extends Model<RefShippingTypeAttributes, RefShippingTypeCreationAttributes> implements RefShippingTypeAttributes {
    declare public id: number;
    declare public name: string;
    declare public service_type: string;
    declare public display_order: number;
    declare public is_active: boolean;
    declare public created_at: Date;
    declare public updated_at: Date;
    declare public deleted_at: Date;
    declare public delete_reason: string;
}

RefShippingType.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        service_type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        display_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        delete_reason: {
            type: DataTypes.STRING,
            allowNull: true,
        }
    },
    {
        sequelize,
        tableName: 'ref_shipping_types',
        timestamps: true,
        paranoid: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
    }
);
