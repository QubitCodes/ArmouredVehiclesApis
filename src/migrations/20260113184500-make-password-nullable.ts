import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.changeColumn('users', 'password', {
    type: DataTypes.TEXT,
    allowNull: true,
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Revert back to not null if needed (though existing nulls would cause this to fail)
  // For safety in dev environment, we can try, but typically down migrations for nullability are tricky if data exists.
  // We'll just define it as non-null for completeness.
  await queryInterface.changeColumn('users', 'password', {
    type: DataTypes.TEXT,
    allowNull: false,
  });
}
