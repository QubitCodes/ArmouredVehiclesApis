import { QueryInterface, DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface: QueryInterface, Sequelize: any) => {
    // 1. Rename column
    await queryInterface.renameColumn('user_profiles', 'controlled_dual_use_items', 'controlled_items');

    // 2. Change column type to BOOLEAN with casting
    // Note: We need to use raw query for safe casting if data exists, but since we are changing type 
    // and setting default, we'll try standard changeColumn first with specific dialect options if needed.
    // However, Sequelize changeColumn might struggle with type conversion + rename in one go if we hadn't renamed first.
    // Since we renamed first, now we change type.

    // Postgres specific casting using explicit USING clause
    await queryInterface.sequelize.query(`
      ALTER TABLE "user_profiles" 
      ALTER COLUMN "controlled_items" TYPE BOOLEAN 
      USING CASE 
        WHEN "controlled_items" = 'Yes' THEN true 
        WHEN "controlled_items" = 'No' THEN false 
        ELSE false 
      END;
    `);

    // 3. Set NOT NULL and DEFAULT false
    await queryInterface.changeColumn('user_profiles', 'controlled_items', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: async (queryInterface: QueryInterface, Sequelize: any) => {
    // Revert steps
    // 1. Remove NOT NULL constraint (implicitly done by changing column back)
    // 2. Change type back to TEXT
    await queryInterface.changeColumn('user_profiles', 'controlled_items', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null
    });

    // Cast back to 'Yes'/'No' if needed, but for down migration we might just leave as "true"/"false" string or map back.
    // Simple revert to text above will result in "true"/"false" strings.
    // If exact reverse is needed:
    await queryInterface.sequelize.query(`
        UPDATE "user_profiles"
        SET "controlled_items" = CASE 
            WHEN "controlled_items" = 'true' THEN 'Yes'
            WHEN "controlled_items" = 'false' THEN 'No'
            ELSE NULL
        END
    `);

    // 3. Rename back
    await queryInterface.renameColumn('user_profiles', 'controlled_items', 'controlled_dual_use_items');
  }
};