import { headers } from 'next/headers';
import { verifyAccessToken } from './jwt';
import { User } from '../models';

/**
 * Helper to apply commission to prices and remove the commission field.
 * commission is value from products table, which stores admin_commission from platform_settings.
 * 
 * ROLE-BASED SUPPRESSION:
 * - Admin/Super Admin/Vendor: Suppression (Raw base_price shown).
 * - Customer/Guest: Applied (Includes specialized discount).
 */
export const applyCommission = async (product: any, discountPercent: number = 0) => {
    if (!product) return product;

    // Handle Sequlize instance or plain object
    const p = product.toJSON ? product.toJSON() : { ...product };

    try {
        // Soft Auth Check within utility
        const headersList = await headers();
        const authHeader = headersList.get('authorization');

        let userRole = 'guest';

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded: any = verifyAccessToken(token);
            const userId = decoded?.userId || decoded?.sub;

            if (userId) {
                const user = await User.findByPk(userId, { attributes: ['user_type'] });
                if (user) userRole = user.user_type;
            }
        }

        // SUPPRESSION RULES: If Admin or Vendor, skip commission application
        if (['admin', 'super_admin', 'vendor'].includes(userRole)) {
            delete p.commission;
            return p;
        }

    } catch (e) {
        // Fallback or Ignore session error (e.g. guest or static rendering)
    }

    const baseCommission = p.commission ? Number(p.commission) : 0;

    // Ensure we have a price to work with (fallback to base_price)
    if (!Number(p.price) && Number(p.base_price)) {
        p.price = Number(p.base_price);
    }

    // Specialized Discount reduces the effective commission
    // e.g. 10% base - 3% specialized = 7% effective
    const effectiveCommission = Math.max(0, baseCommission - Number(discountPercent));

    if (effectiveCommission > 0) {
        const factor = 1 + (effectiveCommission / 100);

        // Apply to main price
        if (p.price) {
            p.price = Math.round(Number(p.price) * factor * 100) / 100;
        }

        // Apply to base price
        if (p.base_price) {
            p.base_price = Math.round(Number(p.base_price) * factor * 100) / 100;
        }

        // Apply to Tiered Pricing (product_pricing_tiers)
        if (Array.isArray(p.pricing_tiers)) {
            p.pricing_tiers = p.pricing_tiers.map((tier: any) => ({
                ...tier,
                price: Math.round(Number(tier.price) * factor * 100) / 100
            }));
        }

        // Apply to Individual Product Pricing (JSONB field)
        if (Array.isArray(p.individual_product_pricing)) {
            p.individual_product_pricing = p.individual_product_pricing.map((item: any) => ({
                ...item,
                amount: Math.round(Number(item.amount) * factor * 100) / 100
            }));
        }
    }

    // Remove valid commission field so frontend never sees it
    delete p.commission;

    return p;
};
