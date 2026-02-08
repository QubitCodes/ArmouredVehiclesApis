/**
 * CurrencyService - Currency Exchange Rate Synchronization
 * 
 * Uses fawazahmed0/exchange-api (free, no rate limits, 200+ currencies)
 * to sync exchange rates daily with AED as base currency.
 * 
 * @module services/CurrencyService
 */

import { RefCurrency } from '../models/Reference';
import { PlatformSetting } from '../models/PlatformSetting';
import { Op } from 'sequelize';

// API Configuration
const CURRENCY_API_BASE = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1';
const FALLBACK_API_BASE = 'https://latest.currency-api.pages.dev/v1';

// Sync interval in milliseconds (24 hours)
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Platform setting keys for currency sync
 */
const SETTINGS = {
    LAST_SYNC: 'currency_last_sync',
    SYNC_ENABLED: 'currency_sync_enabled',
    HOMEPAGE_SYNC_ENABLED: 'currency_homepage_sync_enabled',
};

export class CurrencyService {
    /**
     * Check if enough time has passed since last sync (24 hours)
     */
    static async shouldSync(): Promise<boolean> {
        try {
            const lastSyncSetting = await PlatformSetting.findOne({
                where: { key: SETTINGS.LAST_SYNC }
            });

            if (!lastSyncSetting) {
                return true; // Never synced before
            }

            const lastSync = new Date(lastSyncSetting.value).getTime();
            const now = Date.now();

            return (now - lastSync) >= SYNC_INTERVAL_MS;
        } catch (error) {
            console.error('[CurrencyService] Error checking sync status:', error);
            return false;
        }
    }

    /**
     * Check if sync is enabled via platform settings
     */
    static async isSyncEnabled(): Promise<boolean> {
        try {
            const setting = await PlatformSetting.findOne({
                where: { key: SETTINGS.SYNC_ENABLED }
            });

            // Default to enabled if setting doesn't exist
            return setting ? setting.value === 'true' : true;
        } catch (error) {
            console.error('[CurrencyService] Error checking sync enabled:', error);
            return true;
        }
    }

    /**
     * Check if homepage-triggered sync is enabled
     */
    static async isHomepageSyncEnabled(): Promise<boolean> {
        try {
            const setting = await PlatformSetting.findOne({
                where: { key: SETTINGS.HOMEPAGE_SYNC_ENABLED }
            });

            // Default to enabled if setting doesn't exist
            return setting ? setting.value === 'true' : true;
        } catch (error) {
            console.error('[CurrencyService] Error checking homepage sync:', error);
            return true;
        }
    }

    /**
     * Update last sync timestamp
     */
    static async updateLastSyncTime(): Promise<void> {
        try {
            const now = new Date().toISOString();

            await PlatformSetting.upsert({
                key: SETTINGS.LAST_SYNC,
                value: now,
                description: 'Last currency exchange rate sync timestamp'
            });
        } catch (error) {
            console.error('[CurrencyService] Error updating last sync time:', error);
        }
    }

    /**
     * Fetch exchange rates from the API
     * Uses AED as base currency
     */
    static async fetchRates(): Promise<Record<string, number> | null> {
        const urls = [
            `${CURRENCY_API_BASE}/currencies/aed.json`,
            `${FALLBACK_API_BASE}/currencies/aed.json`
        ];

        for (const url of urls) {
            try {

                const response = await fetch(url, {
                    headers: { 'Accept': 'application/json' },
                    signal: AbortSignal.timeout(10000) // 10 second timeout
                });

                if (!response.ok) {
                    continue;
                }

                const data = await response.json();

                if (data && data.aed) {
                    return data.aed;
                }
            } catch (error) {
                console.error(`[CurrencyService] Error fetching from ${url}:`, error);
            }
        }

        console.error('[CurrencyService] All API endpoints failed');
        return null;
    }

    /**
     * Sync exchange rates for all currencies in the database
     */
    static async syncRates(): Promise<{ success: boolean; updated: number; message: string }> {
        try {
            // Check if sync is enabled
            const enabled = await this.isSyncEnabled();
            if (!enabled) {
                return { success: false, updated: 0, message: 'Currency sync is disabled' };
            }

            // Fetch rates from API
            const rates = await this.fetchRates();
            if (!rates) {
                return { success: false, updated: 0, message: 'Failed to fetch rates from API' };
            }

            // Get all currencies from database
            const currencies = await RefCurrency.findAll({
                where: { is_active: true }
            });

            if (currencies.length === 0) {
                return { success: false, updated: 0, message: 'No currencies found in database' };
            }

            let updatedCount = 0;
            const now = new Date();

            for (const currency of currencies) {
                const code = (currency as any).code?.toLowerCase();

                if (!code) continue;

                // AED is base currency, rate is always 1
                if (code === 'aed') {
                    await currency.update({
                        exchange_rate: 1.0,
                        is_base: true,
                        rate_updated_at: now
                    });
                    updatedCount++;
                    continue;
                }

                // Look up rate in API response
                const rate = rates[code];

                if (rate && typeof rate === 'number' && rate > 0) {
                    await currency.update({
                        exchange_rate: rate,
                        is_base: false,
                        rate_updated_at: now
                    });
                    updatedCount++;
                    updatedCount++;
                }
            }

            // Update last sync timestamp
            await this.updateLastSyncTime();

            return {
                success: true,
                updated: updatedCount,
                message: `Successfully updated ${updatedCount} currencies`
            };
        } catch (error) {
            console.error('[CurrencyService] Sync error:', error);
            return {
                success: false,
                updated: 0,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Trigger sync from homepage (with 24-hour cooldown check)
     * This is a non-blocking background task
     */
    static async triggerHomepageSync(): Promise<void> {
        try {
            // Check if homepage sync is enabled
            const homepageEnabled = await this.isHomepageSyncEnabled();
            if (!homepageEnabled) {
                return;
            }

            // Check if enough time has passed
            const shouldSync = await this.shouldSync();
            if (!shouldSync) {
                return;
            }

            // Run sync in background (don't await)
            this.syncRates()
                .then(result => {
                    // Sync complete
                })
                .catch(err => {
                    console.error('[CurrencyService] Homepage sync error:', err);
                });
        } catch (error) {
            console.error('[CurrencyService] Error in homepage sync trigger:', error);
        }
    }

    /**
     * Convert amount from one currency to another
     * @param amount The amount to convert
     * @param fromCode Source currency code (e.g., 'USD')
     * @param toCode Target currency code (e.g., 'AED')
     */
    static async convert(amount: number, fromCode: string, toCode: string): Promise<number | null> {
        try {
            const fromCurrency = await RefCurrency.findOne({
                where: { code: fromCode.toUpperCase() }
            });
            const toCurrency = await RefCurrency.findOne({
                where: { code: toCode.toUpperCase() }
            });

            if (!fromCurrency || !toCurrency) {
                console.warn(`[CurrencyService] Currency not found: ${fromCode} or ${toCode}`);
                return null;
            }

            const fromRate = Number((fromCurrency as any).exchange_rate);
            const toRate = Number((toCurrency as any).exchange_rate);

            if (!fromRate || !toRate) {
                console.warn('[CurrencyService] Invalid exchange rates');
                return null;
            }

            // Convert: amount in fromCurrency -> AED -> toCurrency
            // 1 AED = fromRate of fromCurrency
            // 1 AED = toRate of toCurrency
            // So: amount / fromRate = amount in AED, then * toRate = amount in toCurrency
            const aedAmount = amount / fromRate;
            const result = aedAmount * toRate;

            return Math.round(result * 100) / 100; // Round to 2 decimal places
        } catch (error) {
            console.error('[CurrencyService] Conversion error:', error);
            return null;
        }
    }

    /**
     * Get exchange rate for a specific currency
     * @param code Currency code (e.g., 'USD')
     * @returns Exchange rate (1 AED = X of this currency)
     */
    static async getRate(code: string): Promise<number | null> {
        try {
            const currency = await RefCurrency.findOne({
                where: { code: code.toUpperCase() }
            });

            if (!currency) {
                return null;
            }

            return Number((currency as any).exchange_rate);
        } catch (error) {
            console.error('[CurrencyService] Error getting rate:', error);
            return null;
        }
    }

    /**
     * Get all active currencies with their rates
     */
    static async getAllRates(): Promise<Array<{ code: string; name: string; rate: number; updatedAt: Date | null }>> {
        try {
            const currencies = await RefCurrency.findAll({
                where: { is_active: true },
                order: [['is_base', 'DESC'], ['code', 'ASC']]
            });

            return currencies.map((c: any) => ({
                code: c.code,
                name: c.name,
                rate: Number(c.exchange_rate),
                updatedAt: c.rate_updated_at
            }));
        } catch (error) {
            console.error('[CurrencyService] Error getting all rates:', error);
            return [];
        }
    }
}
