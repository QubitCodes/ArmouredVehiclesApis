
import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    // Specs
    await queryInterface.addColumn('products', 'dimension_length', { type: DataTypes.DECIMAL(10, 2), allowNull: true });
    await queryInterface.addColumn('products', 'dimension_width', { type: DataTypes.DECIMAL(10, 2), allowNull: true });
    await queryInterface.addColumn('products', 'dimension_height', { type: DataTypes.DECIMAL(10, 2), allowNull: true });
    await queryInterface.addColumn('products', 'dimension_unit', { type: DataTypes.TEXT, allowNull: true });
    await queryInterface.addColumn('products', 'materials', { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: true });
    await queryInterface.addColumn('products', 'features', { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: true });
    await queryInterface.addColumn('products', 'performance', { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: true });
    await queryInterface.addColumn('products', 'technical_description', { type: DataTypes.TEXT, allowNull: true });

    // Variants
    await queryInterface.addColumn('products', 'drive_types', { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: true });
    await queryInterface.addColumn('products', 'sizes', { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: true });
    await queryInterface.addColumn('products', 'thickness', { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: true });
    await queryInterface.addColumn('products', 'colors', { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: true });
    await queryInterface.addColumn('products', 'weight_value', { type: DataTypes.DECIMAL(10, 2), allowNull: true });
    await queryInterface.addColumn('products', 'weight_unit', { type: DataTypes.TEXT, allowNull: true });

    // Packing
    await queryInterface.addColumn('products', 'packing_length', { type: DataTypes.DECIMAL(10, 2), allowNull: true });
    await queryInterface.addColumn('products', 'packing_width', { type: DataTypes.DECIMAL(10, 2), allowNull: true });
    await queryInterface.addColumn('products', 'packing_height', { type: DataTypes.DECIMAL(10, 2), allowNull: true });
    await queryInterface.addColumn('products', 'packing_dimension_unit', { type: DataTypes.TEXT, allowNull: true });
    await queryInterface.addColumn('products', 'packing_weight', { type: DataTypes.DECIMAL(10, 2), allowNull: true });
    await queryInterface.addColumn('products', 'packing_weight_unit', { type: DataTypes.TEXT, allowNull: true });
    await queryInterface.addColumn('products', 'min_order_quantity', { type: DataTypes.INTEGER, allowNull: true });

    // Pricing & Stock
    await queryInterface.addColumn('products', 'base_price', { type: DataTypes.DECIMAL(10, 2), allowNull: true });
    await queryInterface.addColumn('products', 'currency', { type: DataTypes.TEXT, defaultValue: 'USD', allowNull: true });
    await queryInterface.addColumn('products', 'pricing_terms', { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: true });
    await queryInterface.addColumn('products', 'production_lead_time', { type: DataTypes.INTEGER, allowNull: true });
    await queryInterface.addColumn('products', 'ready_stock_available', { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: true });
    await queryInterface.addColumn('products', 'stock', { type: DataTypes.INTEGER, defaultValue: 0, allowNull: true });

    // Compliance
    await queryInterface.addColumn('products', 'manufacturing_source', { type: DataTypes.TEXT, allowNull: true });
    await queryInterface.addColumn('products', 'manufacturing_source_name', { type: DataTypes.TEXT, allowNull: true });
    await queryInterface.addColumn('products', 'requires_export_license', { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: true });
    await queryInterface.addColumn('products', 'has_warranty', { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: true });
    await queryInterface.addColumn('products', 'warranty_duration', { type: DataTypes.INTEGER, allowNull: true });
    await queryInterface.addColumn('products', 'warranty_duration_unit', { type: DataTypes.TEXT, allowNull: true });
    await queryInterface.addColumn('products', 'warranty_terms', { type: DataTypes.TEXT, allowNull: true });
    await queryInterface.addColumn('products', 'compliance_confirmed', { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: true });
    await queryInterface.addColumn('products', 'supplier_signature', { type: DataTypes.TEXT, allowNull: true });
    await queryInterface.addColumn('products', 'submission_date', { type: DataTypes.DATE, allowNull: true });

    // Legacy/Computed
    await queryInterface.addColumn('products', 'price', { type: DataTypes.DECIMAL(10, 2), allowNull: true });
    await queryInterface.addColumn('products', 'original_price', { type: DataTypes.DECIMAL(10, 2), allowNull: true });
    await queryInterface.addColumn('products', 'image', { type: DataTypes.TEXT, allowNull: true });
    await queryInterface.addColumn('products', 'gallery', { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: true });

    // Additional Legacy
    await queryInterface.addColumn('products', 'make', { type: DataTypes.TEXT, allowNull: true });
    await queryInterface.addColumn('products', 'model', { type: DataTypes.TEXT, allowNull: true });
    await queryInterface.addColumn('products', 'year', { type: DataTypes.INTEGER, allowNull: true });
    await queryInterface.addColumn('products', 'specifications', { type: DataTypes.TEXT, allowNull: true });
    await queryInterface.addColumn('products', 'vehicle_fitment', { type: DataTypes.TEXT, allowNull: true });
    await queryInterface.addColumn('products', 'warranty', { type: DataTypes.TEXT, allowNull: true }); // Legacy field
    await queryInterface.addColumn('products', 'action_type', { type: DataTypes.TEXT, defaultValue: 'buy_now', allowNull: true });

    // Admin
    await queryInterface.addColumn('products', 'reviewed_by', { type: DataTypes.STRING, allowNull: true });
    await queryInterface.addColumn('products', 'reviewed_at', { type: DataTypes.DATE, allowNull: true });
    await queryInterface.addColumn('products', 'review_note', { type: DataTypes.TEXT, allowNull: true });
  },

  down: async (queryInterface: QueryInterface) => {
    // Drop all added columns
    await queryInterface.removeColumn('products', 'dimension_length');
    await queryInterface.removeColumn('products', 'dimension_width');
    await queryInterface.removeColumn('products', 'dimension_height');
    await queryInterface.removeColumn('products', 'dimension_unit');
    await queryInterface.removeColumn('products', 'materials');
    await queryInterface.removeColumn('products', 'features');
    await queryInterface.removeColumn('products', 'performance');
    await queryInterface.removeColumn('products', 'technical_description');

    await queryInterface.removeColumn('products', 'drive_types');
    await queryInterface.removeColumn('products', 'sizes');
    await queryInterface.removeColumn('products', 'thickness');
    await queryInterface.removeColumn('products', 'colors');
    await queryInterface.removeColumn('products', 'weight_value');
    await queryInterface.removeColumn('products', 'weight_unit');

    await queryInterface.removeColumn('products', 'packing_length');
    await queryInterface.removeColumn('products', 'packing_width');
    await queryInterface.removeColumn('products', 'packing_height');
    await queryInterface.removeColumn('products', 'packing_dimension_unit');
    await queryInterface.removeColumn('products', 'packing_weight');
    await queryInterface.removeColumn('products', 'packing_weight_unit');
    await queryInterface.removeColumn('products', 'min_order_quantity');

    await queryInterface.removeColumn('products', 'base_price');
    await queryInterface.removeColumn('products', 'currency');
    await queryInterface.removeColumn('products', 'pricing_terms');
    await queryInterface.removeColumn('products', 'production_lead_time');
    await queryInterface.removeColumn('products', 'ready_stock_available');
    await queryInterface.removeColumn('products', 'stock');

    await queryInterface.removeColumn('products', 'manufacturing_source');
    await queryInterface.removeColumn('products', 'manufacturing_source_name');
    await queryInterface.removeColumn('products', 'requires_export_license');
    await queryInterface.removeColumn('products', 'has_warranty');
    await queryInterface.removeColumn('products', 'warranty_duration');
    await queryInterface.removeColumn('products', 'warranty_duration_unit');
    await queryInterface.removeColumn('products', 'warranty_terms');
    await queryInterface.removeColumn('products', 'compliance_confirmed');
    await queryInterface.removeColumn('products', 'supplier_signature');
    await queryInterface.removeColumn('products', 'submission_date');

    await queryInterface.removeColumn('products', 'price');
    await queryInterface.removeColumn('products', 'original_price');
    await queryInterface.removeColumn('products', 'image');
    await queryInterface.removeColumn('products', 'gallery');

    await queryInterface.removeColumn('products', 'make');
    await queryInterface.removeColumn('products', 'model');
    await queryInterface.removeColumn('products', 'year');
    await queryInterface.removeColumn('products', 'specifications');
    await queryInterface.removeColumn('products', 'vehicle_fitment');
    await queryInterface.removeColumn('products', 'warranty');
    await queryInterface.removeColumn('products', 'action_type');

    await queryInterface.removeColumn('products', 'reviewed_by');
    await queryInterface.removeColumn('products', 'reviewed_at');
    await queryInterface.removeColumn('products', 'review_note');
  }
};
