import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface FrontendSliderAttributes {
    id: string;
    image_url: string;
    title?: string;
    subtitle?: string;
    link?: string;
    button_text?: string;
    is_active: boolean;
    valid_till?: Date | null;
    sort_order: number;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
}

interface FrontendSliderCreationAttributes extends Optional<FrontendSliderAttributes, 'id' | 'is_active' | 'sort_order'> {}

class FrontendSlider extends Model<FrontendSliderAttributes, FrontendSliderCreationAttributes> implements FrontendSliderAttributes {
    public id!: string;
    public image_url!: string;
    public title?: string;
    public subtitle?: string;
    public link?: string;
    public button_text?: string;
    public is_active!: boolean;
    public valid_till?: Date | null;
    public sort_order!: number;
    
    public readonly created_at!: Date;
    public readonly updated_at!: Date;
    public readonly deleted_at!: Date;
}

FrontendSlider.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        image_url: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        subtitle: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        link: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        button_text: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        valid_till: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        sort_order: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
    },
    {
        sequelize,
        tableName: 'frontend_sliders',
        modelName: 'FrontendSlider',
        timestamps: true,
        paranoid: true,
        underscored: true,
    }
);

export default FrontendSlider;
