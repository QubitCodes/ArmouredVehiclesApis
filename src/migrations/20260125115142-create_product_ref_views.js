'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Color View
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW ref_product_color_view AS
      SELECT DISTINCT unnest(colors) as color 
      FROM products 
      WHERE deleted_at IS NULL AND colors IS NOT NULL;
    `);

    // 2. Size View (Attributes: original_size, length, width, height, unit)
    // format: "10x20x30 mm"
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW ref_product_size_view AS
      WITH unnested AS (
          SELECT DISTINCT unnest(sizes) as raw_size 
          FROM products 
          WHERE deleted_at IS NULL AND sizes IS NOT NULL
      )
      SELECT 
          raw_size as original_size,
          NULLIF(regexp_replace(split_part(split_part(raw_size, ' ', 1), 'x', 1), '[^0-9.]', '', 'g'), '')::numeric as length,
          NULLIF(regexp_replace(split_part(split_part(raw_size, ' ', 1), 'x', 2), '[^0-9.]', '', 'g'), '')::numeric as width,
          NULLIF(regexp_replace(split_part(split_part(raw_size, ' ', 1), 'x', 3), '[^0-9.]', '', 'g'), '')::numeric as height,
          split_part(raw_size, ' ', 2) as unit
      FROM unnested;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS ref_product_size_view');
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS ref_product_color_view');
  }
};
