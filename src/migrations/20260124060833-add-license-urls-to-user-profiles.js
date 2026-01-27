'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_profiles', 'eocn_approval_url', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('user_profiles', 'itar_registration_url', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('user_profiles', 'local_authority_approval_url', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('user_profiles', 'eocn_approval_url');
    await queryInterface.removeColumn('user_profiles', 'itar_registration_url');
    await queryInterface.removeColumn('user_profiles', 'local_authority_approval_url');
  }
};
