// Helper to apply commission to prices and remove the commission field
// commission is value from products table, which stores admin_commission from platform_settings

export const applyCommission = (product: any) => {
    if (!product) return product;

    // Handle Sequlize instance or plain object
    const p = product.toJSON ? product.toJSON() : product;
    const commission = p.commission ? Number(p.commission) : 0;

    if (commission > 0) {
        const factor = 1 + (commission / 100);

        // Apply to main price
        if (p.price) {
            p.price = Math.round(Number(p.price) * factor * 100) / 100;
        }

        // Apply to base price
        if (p.base_price) {
            p.base_price = Math.round(Number(p.base_price) * factor * 100) / 100;
        }

        // Apply to Tiered Pricing (product_pricing_tiers)
        // Sometimes tiers are loaded as `pricing_tiers` or could be accessed differently
        // Assuming standard structure if loaded
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
