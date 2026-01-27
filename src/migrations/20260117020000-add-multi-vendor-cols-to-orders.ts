
import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('orders', 'order_group_id', {
      type: DataTypes.UUID,
      allowNull: true, 
    });
    
    // Add index for faster lookup of grouped orders
    await queryInterface.addIndex('orders', ['order_group_id']);

    await queryInterface.addColumn('orders', 'vendor_id', {
      type: DataTypes.UUID,
      allowNull: true,
    });

    await queryInterface.addColumn('orders', 'vat_amount', {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
    });

    await queryInterface.addColumn('orders', 'admin_commission', {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: false,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('orders', 'admin_commission');
    await queryInterface.removeColumn('orders', 'vat_amount');
    await queryInterface.removeColumn('orders', 'vendor_id');
    await queryInterface.removeIndex('orders', ['order_group_id']);
    await queryInterface.removeColumn('orders', 'order_group_id');
  },
};
