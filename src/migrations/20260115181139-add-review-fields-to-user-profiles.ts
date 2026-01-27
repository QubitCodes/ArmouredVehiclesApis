import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface: QueryInterface, Sequelize: any) => {
    await queryInterface.addColumn('user_profiles', 'rejection_reason', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('user_profiles', 'reviewed_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('user_profiles', 'reviewed_by', {
      type: Sequelize.UUID,
      allowNull: true
    });
    await queryInterface.addColumn('user_profiles', 'review_note', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface, Sequelize: any) => {
    await queryInterface.removeColumn('user_profiles', 'rejection_reason');
    await queryInterface.removeColumn('user_profiles', 'reviewed_at');
    await queryInterface.removeColumn('user_profiles', 'reviewed_by');
    await queryInterface.removeColumn('user_profiles', 'review_note');
  }
};