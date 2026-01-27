import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface: QueryInterface, Sequelize: any) => {
    // Intentionally empty as this migration was marked executed but failed to run content.
    // Logic moved to 20260111023000-add-rating-and-review-count.js
  },

  down: async (queryInterface: QueryInterface, Sequelize: any) => {
    // Intentionally empty
  }
};