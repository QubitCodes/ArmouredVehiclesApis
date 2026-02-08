import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Add exchange rate columns to ref_currencies
 * 
 * This adds support for dynamic currency exchange rates with AED as the base currency.
 * Rates represent how much of the foreign currency equals 1 AED.
 * 
 * Example: exchange_rate = 0.2723 for USD means 1 AED = 0.2723 USD
 * To convert USD to AED: usd_amount / 0.2723
 * To convert AED to USD: aed_amount * 0.2723
 */
module.exports = {
    async up(queryInterface: QueryInterface) {
        // Add exchange_rate column - stores rate relative to AED (base currency)
        await queryInterface.addColumn('ref_currencies', 'exchange_rate', {
            type: DataTypes.DECIMAL(18, 8),
            allowNull: false,
            defaultValue: 1.0,
            comment: 'Exchange rate: 1 AED = X of this currency'
        });

        // Add rate_updated_at column - tracks when rate was last fetched
        await queryInterface.addColumn('ref_currencies', 'rate_updated_at', {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Timestamp of last rate update from external API'
        });

        // Add is_base column - marks AED as the base currency
        await queryInterface.addColumn('ref_currencies', 'is_base', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'TRUE for AED (base currency), FALSE for all others'
        });

        // Set AED as base currency and update initial exchange rates
        await queryInterface.sequelize.query(`
			UPDATE ref_currencies SET is_base = TRUE, exchange_rate = 1.0, rate_updated_at = NOW() WHERE code = 'AED';
		`);

        // Set initial approximate exchange rates for common currencies
        // These will be updated by the CurrencyService on first sync
        await queryInterface.sequelize.query(`
			UPDATE ref_currencies SET exchange_rate = 0.2723, rate_updated_at = NOW() WHERE code = 'USD';
		`);

        await queryInterface.sequelize.query(`
			UPDATE ref_currencies SET exchange_rate = 0.2494, rate_updated_at = NOW() WHERE code = 'EUR';
		`);
    },

    async down(queryInterface: QueryInterface) {
        await queryInterface.removeColumn('ref_currencies', 'exchange_rate');
        await queryInterface.removeColumn('ref_currencies', 'rate_updated_at');
        await queryInterface.removeColumn('ref_currencies', 'is_base');
    }
};
