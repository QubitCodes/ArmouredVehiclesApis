import { PlatformSetting } from '../models';

/**
 * VatRule Interface
 * Represents a single VAT scenario rule from platform_settings.vat_rules
 */
export interface VatRule {
    id: number;
    scenario: string;
    source_region: string;
    destination_region: string;
    vendor_to_admin_vat_percent: number;
    admin_to_customer_vat_percent: number;
}

/**
 * VatResult Interface
 * The result object returned by getVatForScenario
 */
export interface VatResult {
    /** VAT % the vendor charges to admin */
    vendorToAdminVat: number;
    /** VAT % the admin charges to customer */
    adminToCustomerVat: number;
    /** The matched scenario label (e.g. 'Local Sale', 'Export') */
    scenario: string;
}

/**
 * UAE country string variants used for region classification
 */
const UAE_VARIANTS = [
    'ae',
];

/**
 * Default VAT percentages if no rules are found
 */
const DEFAULT_VAT_PERCENT = 5;

/**
 * VatService
 * Centralized service for VAT logic:
 * - Classifies a country string into 'UAE' or 'ROW' (Rest of World)
 * - Fetches VAT rules from platform_settings
 * - Matches vendor/customer countries against rules and returns applicable rates
 */
export class VatService {
    /**
     * Classifies a country string into a region code.
     * @param country - Country name or code from user profile or address
     * @returns 'UAE' if the country is a UAE variant, 'ROW' otherwise
     */
    static classifyRegion(country: string | null | undefined): 'UAE' | 'ROW' {
        if (!country) return 'ROW';
        const normalized = country.trim().toLowerCase();
        return UAE_VARIANTS.includes(normalized) ? 'UAE' : 'ROW';
    }

    /**
     * Fetches the VAT rules JSON array from platform_settings.
     * @returns Parsed array of VatRule objects, or empty array if not found
     */
    static async getVatRules(): Promise<VatRule[]> {
        try {
            const setting = await PlatformSetting.findOne({ where: { key: 'vat_rules' } });
            if (!setting?.value) return [];

            const parsed = JSON.parse(setting.value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('[VatService] Failed to parse vat_rules:', error);
            return [];
        }
    }

    /**
     * Determines the VAT rates for a given vendor–customer country pair.
     * Matches the classified regions against the vat_rules source_region / destination_region.
     *
     * @param vendorCountry - The vendor's country (from UserProfile.country, stored as uppercase ISO code)
     * @param customerCountry - The customer's registered company country (from UserProfile.country, stored as uppercase ISO code)
     * @returns VatResult with vendorToAdminVat, adminToCustomerVat, and matched scenario
     */
    static async getVatForScenario(
        vendorCountry: string | null | undefined,
        customerCountry: string | null | undefined
    ): Promise<VatResult> {
        const sourceRegion = this.classifyRegion(vendorCountry);
        const destinationRegion = this.classifyRegion(customerCountry);

        const rules = await this.getVatRules();

        // Find matching rule by source + destination region
        const matchedRule = rules.find(
            (r) =>
                r.source_region?.toUpperCase() === sourceRegion &&
                r.destination_region?.toUpperCase() === destinationRegion
        );

        if (matchedRule) {
            return {
                vendorToAdminVat: Number(matchedRule.vendor_to_admin_vat_percent) || 0,
                adminToCustomerVat: Number(matchedRule.admin_to_customer_vat_percent) || 0,
                scenario: matchedRule.scenario || 'Unknown',
            };
        }

        // Fallback: default 5% for both if no rule matches
        console.warn(
            `[VatService] No VAT rule found for source=${sourceRegion}, dest=${destinationRegion}. Using default ${DEFAULT_VAT_PERCENT}%`
        );
        return {
            vendorToAdminVat: DEFAULT_VAT_PERCENT,
            adminToCustomerVat: DEFAULT_VAT_PERCENT,
            scenario: 'Default',
        };
    }
}
