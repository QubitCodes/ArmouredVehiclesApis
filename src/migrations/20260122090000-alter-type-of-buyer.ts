
import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    // 1. Alter Column Type using CAST
    await queryInterface.sequelize.query(
      `ALTER TABLE "user_profiles" 
       ALTER COLUMN "type_of_buyer" TYPE INTEGER 
       USING "type_of_buyer"::integer;`
    );

    // 2. Add Foreign Key Constraint
    await queryInterface.addConstraint('user_profiles', {
      fields: ['type_of_buyer'],
      type: 'foreign key',
      name: 'fk_user_profiles_type_of_buyer',
      references: {
        table: 'ref_buyer_types',
        field: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // 1. Remove Constraint
    await queryInterface.removeConstraint('user_profiles', 'fk_user_profiles_type_of_buyer');

    // 2. Revert Column Type to TEXT
    await queryInterface.changeColumn('user_profiles', 'type_of_buyer', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  },
};
