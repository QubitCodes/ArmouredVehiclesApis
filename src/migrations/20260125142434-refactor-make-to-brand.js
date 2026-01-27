'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Create ref_product_brands table
      await queryInterface.createTable('ref_product_brands', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        slug: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true
        },
        icon: {
          type: Sequelize.STRING,
          allowNull: true
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction });

      // 2. Add brand_id to products
      await queryInterface.addColumn('products', 'brand_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'ref_product_brands',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }, { transaction });

      // 3. Migrate Data
      // 3a. Distinct Makes
      const products = await queryInterface.sequelize.query(
        `SELECT DISTINCT make FROM products WHERE make IS NOT NULL AND deleted_at IS NULL`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      // 3b. Insert Brands and Update Products
      for (const p of products) {
        if (!p.make) continue;
        const brandName = p.make.trim();
        if (!brandName) continue;

        // Insert Brand (Ignore duplicates if any race condition, though distinct handles it)
        // Using raw query to handle returning ID safely across DBs, or findOrCreate logic
        // Simple insert:
        const [results] = await queryInterface.sequelize.query(
          `INSERT INTO ref_product_brands (name, created_at, updated_at) VALUES (:name, NOW(), NOW()) ON CONFLICT (name) DO UPDATE SET updated_at = NOW() RETURNING id`,
          {
            replacements: { name: brandName },
            type: Sequelize.QueryTypes.INSERT, // Sequelize formatting might differ for RETURNING
            transaction
          }
        );

        // results might be [ { id: 1 } ] or depending on driver. 
        // Safer: Select back the ID.
        const [brand] = await queryInterface.sequelize.query(
          `SELECT id FROM ref_product_brands WHERE name = :name`,
          { replacements: { name: brandName }, type: Sequelize.QueryTypes.SELECT, transaction }
        );

        if (brand && brand.id) {
          await queryInterface.sequelize.query(
            `UPDATE products SET brand_id = :brandId WHERE make = :makeName`,
            { replacements: { brandId: brand.id, makeName: p.make }, transaction }
          );
        }
      }

      // 4. Remove 'make' column
      await queryInterface.removeColumn('products', 'make', { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Add 'make' column back
      await queryInterface.addColumn('products', 'make', {
        type: Sequelize.TEXT,
        allowNull: true
      }, { transaction });

      // 2. Migrate Data Back (brand_id -> make)
      // Update matching products
      await queryInterface.sequelize.query(`
        UPDATE products 
        SET make = ref_product_brands.name
        FROM ref_product_brands
        WHERE products.brand_id = ref_product_brands.id
      `, { transaction });

      // 3. Remove brand_id
      await queryInterface.removeColumn('products', 'brand_id', { transaction });

      // 4. Drop table
      await queryInterface.dropTable('ref_product_brands', { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
