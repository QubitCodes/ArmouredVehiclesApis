
const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = {
    up: async (queryInterface) => {
        // Check if setting already exists to avoid duplicates
        const [results] = await queryInterface.sequelize.query(
            "SELECT id FROM \"PlatformSettings\" WHERE key = 'shipping_priority'"
        );

        if (results.length === 0) {
            await queryInterface.bulkInsert('PlatformSettings', [{
                id: uuidv4(),
                key: 'shipping_priority',
                value: JSON.stringify(["FEDEX_INTERNATIONAL_PRIORITY", "INTERNATIONAL_ECONOMY", "FEDEX_GROUND"]),
                type: 'json',
                group: 'shipping',
                is_public: false,
                is_system: true,
                created_at: new Date(),
                updated_at: new Date()
            }]);
        }
    },

    down: async (queryInterface) => {
        await queryInterface.bulkDelete('PlatformSettings', { key: 'shipping_priority' });
    },
};
