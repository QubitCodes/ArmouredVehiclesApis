
import { Cart, CartItem, Product, User, UserProfile, Category } from '../models';

/**
 * Compliance Rule Engine
 * Determines if an order can be processed directly or requires a manual "Request for Purchase" flow.
 * 
 * Rules:
 * 1. Total > 10,000 AED -> Request Purchase.
 * 2. Supplier (Non-UAE) -> Customer (UAE) [Controlled Item] -> Request Purchase (Approval).
 * 3. Supplier (UAE) -> Customer (Any) [Controlled Item] -> Request Purchase (Approval). 
 *    (Assuming UAE suppliers always need approval for controlled items export/sale).
 * 
 * Allowed Direct Purchase:
 * - Supplier (Non-UAE) -> Customer (Non-UAE) [Controlled Item] -> OK.
 * - Non-Controlled Items < 10k AED -> OK.
 */
export class OrderComplianceService {

	/**
	 * Check if cart is eligible for direct checkout
	 */
	static async checkCompliance(userId: string, cartId: string): Promise<{
		type: 'direct' | 'request';
		reasons: string[];
	}> {
		const cart = await Cart.findByPk(cartId, {
			include: [{
				model: CartItem,
				as: 'items',
				include: [{ 
					model: Product, 
					as: 'product',
					include: [{ model: Category, as: 'category' }]
				}]
			}]
		});

		if (!cart || !cart.items || cart.items.length === 0) {
			throw new Error('Cart is empty');
		}

		const user = await User.findByPk(userId, { include: ['profile'] });
		
        // Relaxed check: logic below defaults to undefined country if profile missing
		const customerCountry = user?.profile?.country?.toUpperCase();
		const isCustomerUAE = customerCountry === 'UAE' || customerCountry === 'AE' || customerCountry === 'UNITED ARAB EMIRATES';

		const reasons: string[] = [];
		let requiresRequest = false;

		// 1. Check Total Amount
		let totalAmount = 0;
		for (const item of cart.items) {
			// Check if product has base_price, otherwise get from tiers (simplified for check)
			// Assuming price is available on product for now, or fetch logic needed
			// For this logic, we'll use a placeholder or assume price is populated.
			// Ideally CartItem should store snapshot price or fetch real-time.
			// Let's assume we fetch product price.
			
			// TODO: Add proper price logic. Using base_price or lowest tier for check.
			const price = item.product?.base_price || 0; 
			totalAmount += Number(price) * item.quantity;
		}

		if (totalAmount > 10000) {
			requiresRequest = true;
			reasons.push('Total amount exceeds 10,000 AED limit for direct online payment.');
		}

		// 2. Check Controlled Items
		for (const item of cart.items) {
			if (!item.product) continue;

			// Check recursive category control
			const isControlled = await this.isProductControlled(item.product.category_id);
			
			if (isControlled) {
				// We need vendor info to know Supplier Country.
				// Assuming Product -> Vendor -> Profile -> Country
				// Since we don't have deep eager load here, we might need to fetch vendor.
				const vendor = await User.findByPk(item.product.vendor_id, { include: ['profile'] });
				const vendorCountry = vendor?.profile?.country?.toUpperCase();
				const isVendorUAE = vendorCountry === 'UAE' || vendorCountry === 'AE' || vendorCountry === 'UNITED ARAB EMIRATES';

				// Rule: Supplier (Non-UAE) -> Customer (UAE)
				if (!isVendorUAE && isCustomerUAE) {
					requiresRequest = true;
					reasons.push(`Controlled item '${item.product.name}' requires approval (Import to UAE).`);
				}

				// Rule: Supplier (UAE) -> Any Customer
				// Assumption: UAE suppliers selling controlled items probably need export approval/local clearance.
				if (isVendorUAE) {
					requiresRequest = true;
					reasons.push(`Controlled item '${item.product.name}' from UAE supplier requires approval.`);
				}
				
				// Rule: Supplier (Non-UAE) -> Customer (Non-UAE) -> OK (Direct)
				// Implicitly handled (requiresRequest remains false if not hit above)
			}
		}

		return {
			type: requiresRequest ? 'request' : 'direct',
			reasons
		};
	}

	/**
	 * Traverse category tree to check 'is_controlled'
	 */
	private static async isProductControlled(categoryId?: number): Promise<boolean> {
		if (!categoryId) return false;

		let currentId: number | null = categoryId;
		while (currentId) {
			const category: any = await Category.findByPk(currentId);
			if (!category) break;
			if (category.is_controlled) return true;
			currentId = category.parent_id || null;
		}
		return false;
	}
}
