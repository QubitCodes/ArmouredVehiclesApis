
import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { Cart, CartItem, Product, ProductMedia, ProductPricingTier, Category, ProductSpecification, User, UserProfile } from '../models';
import { verifyAccessToken } from '../utils/jwt';
import { applyCommission } from '../utils/priceHelper';
import { Op } from 'sequelize';
import { getFileUrl } from '../utils/fileUrl';

/**
 * Cart Controller
 * Handles shopping cart operations for guests and authenticated users
 */
export class CartController extends BaseController {

	/**
	 * Helper to get user or session ID
	 */
	private async getContext(req: NextRequest) {
		const authHeader = req.headers.get('authorization');
		const sessionIdClient = req.headers.get('x-session-id');

		console.log(`[CHECKOUT DEBUG] CART API (${req.nextUrl.pathname}): AuthHeader=${authHeader ? 'YES' : 'NO'}, SessionID=${sessionIdClient}`);
		if (authHeader) console.log(`[CHECKOUT DEBUG] CART API: Token start=${authHeader.substring(0, 20)}`);

		let userId: string | null = null;
		let sessionId: string | null = sessionIdClient; // Client must send this generated ID

		if (authHeader && authHeader.startsWith('Bearer ')) {
			try {
				const token = authHeader.split(' ')[1];
				const decoded: any = verifyAccessToken(token);
				if (decoded && (decoded.sub || decoded.userId)) {
					userId = decoded.sub || decoded.userId;
				}
				console.log(`[CHECKOUT DEBUG] CART API: Resolved UserID=${userId}`);
			} catch (e) {
				// Invalid token -> Throw 401
				console.log(`[CHECKOUT DEBUG] CART API: Token Invalid/Expired`);
				throw new Error('TOKEN_EXPIRED');
			}
		} else {
			// GUEST LOGIC DISABLED (Strict Auth Enforced)
			console.log(`[CHECKOUT DEBUG] CART API: Guest Access Blocked (Strict Mode)`);
			throw new Error('TOKEN_MISSING');

			/* 
			// --- Legacy Hybrid/Guest Logic (Preserved for future use. JkWorkz) ---
			console.log(`[CHECKOUT DEBUG] CART API: Is Guest`);
			// Session logic was here - implied by userId being null and sessionId being set
			// For now, we fall through, but if we want to block guests, we throw error.
			*/
		}

		return { userId, sessionId };
	}

	/**
	 * Find or Create Cart
	 */
	private async findOrCreateCart(userId: string | null, sessionId: string | null) {
		if (!userId && !sessionId) return null;

		const whereClause: any = { status: 'active' };
		if (userId) {
			whereClause.user_id = userId;
		} else {
			whereClause.session_id = sessionId;
			// Ensure we don't accidentally pick up a cart that has a user_id if we only have session_id
			whereClause.user_id = null;
		}

		let cart = await Cart.findOne({ where: whereClause });

		if (!cart) {
			cart = await Cart.create({
				user_id: userId,
				session_id: sessionId,
				status: 'active'
			});
		}

		return cart;
	}

	/**
	 * GET /api/v1/cart
	 * Get current cart
	 */
	async getCart(req: NextRequest) {
		try {
			const { userId, sessionId } = await this.getContext(req);
			if (!userId && !sessionId) {
				return this.sendError('Session ID or Auth Token required', 400);
			}

			const cart = await this.findOrCreateCart(userId, sessionId);
			if (!cart) {
				// Should not happen as findOrCreateCart creates one
				return this.sendError('Could not retrieve cart', 500);
			}

			const items = await CartItem.findAll({
				where: { cart_id: cart.id },
				include: [
					{
						model: Product,
						as: 'product',
						include: [
							{ model: ProductMedia, as: 'media', limit: 1 },
							{ model: ProductPricingTier, as: 'pricing_tiers' },
							{ model: ProductSpecification, as: 'product_specifications' },
							{ model: Category, as: 'category', attributes: ['id', 'name', 'is_controlled'] },
							{ model: Category, as: 'main_category', attributes: ['id', 'name', 'is_controlled'] },
							{ model: Category, as: 'sub_category', attributes: ['id', 'name', 'is_controlled'] },
							{
								model: User,
								as: 'vendor',
								attributes: ['id', 'name', 'email'],
								include: [{ model: UserProfile, as: 'profile', attributes: ['company_name', 'city', 'country'] }]
							}
						]
					}
				]
			});

			// Fetch user profile for discount (if applicable)
			const userProfile = userId ? await UserProfile.findOne({ where: { user_id: userId } }) : null;
			const discountPercent = userProfile?.discount || 0;

			// Format items to include is_controlled, dimensions, and ensure helper format
			const formattedItems = await Promise.all(items.map(async (item: any) => {
				const plainItem = item.toJSON();
				const p = await applyCommission(plainItem.product, discountPercent);

				if (p) {
					// Calculate is_controlled
					const mainCat = p.main_category;
					const cat = p.category;
					const subCat = p.sub_category;

					p.is_controlled = (
						(mainCat?.is_controlled === true) ||
						(cat?.is_controlled === true) ||
						(subCat?.is_controlled === true)
					);

					// Ensure image is set from media if available
					if (!p.image && p.media && p.media.length > 0) {
						// ProductMedia uses 'url'
						p.image = getFileUrl(p.media[0].url);
					}

					// Ensure price is set from base_price if price is 0/null
					// Cast to Number to be safe
					const basePrice = Number(p.base_price);
					const currentPrice = Number(p.price);

					if (!currentPrice && basePrice) {
						p.price = basePrice;
					}

					// --- Dimension Calculation (Server-Side) ---
					const dims = this.calculateItemDimensions(p);
					plainItem.dimensions = dims;
					plainItem.formatted_dimensions = `${dims.length}x${dims.width}x${dims.height} ${dims.unit}`;

					// Re-assign formatted product back to item
					plainItem.product = p;
				}
				return plainItem;
			}));

			// Group by Vendor and filter out items with no product (deleted)
			const groupedItems = formattedItems.reduce((acc: any, item: any) => {
				if (!item.product) return acc; // Filter out items with missing/deleted products

				const vid = item.product?.vendor_id || 'admin';
				if (!acc[vid]) acc[vid] = [];
				acc[vid].push(item);
				return acc;
			}, {});

			// Proactive Cleanup: Remove items with deleted products from DB async (don't block response)
			const deletedItemIds = formattedItems
				.filter((item: any) => !item.product)
				.map((item: any) => item.id);

			if (deletedItemIds.length > 0) {
				console.log(`[CART] Cleaning up ${deletedItemIds.length} items with deleted products`);
				CartItem.destroy({ where: { id: { [Op.in]: deletedItemIds } } }).catch(err => {
					console.error('[CART] Failed to cleanup deleted product items:', err);
				});
			}

			return this.sendSuccess({
				cart: groupedItems
			});
		} catch (error: any) {
			if (error.message === 'TOKEN_EXPIRED') return this.sendError('Token expired', 210, [], undefined, req);
			if (error.message === 'TOKEN_MISSING') return this.sendError('Authentication required', 210, [], undefined, req);
			return this.sendError(String((error as any).message), 500, [], undefined, req);
		}
	}

	/**
	 * Parse Dimensions Helper
	 */
	private calculateItemDimensions(p: any) {
		let l = Number(p.dimension_length || 0);
		let wid = Number(p.dimension_width || 0);
		let h = Number(p.dimension_height || 0);
		let unit = 'CM'; // Default return unit

		// 1. If columns have data, use them (Assuming CM or converted)
		if (l > 0 && wid > 0 && h > 0) {
			return { length: l, width: wid, height: h, unit };
		}

		// 2. Search Specifications
		let specsToSearch: any[] = [];
		if (Array.isArray(p.product_specifications)) {
			specsToSearch = [...p.product_specifications];
		}
		if (typeof p.specifications === 'string' && p.specifications.trim().startsWith('[')) {
			try {
				const parsed = JSON.parse(p.specifications);
				if (Array.isArray(parsed)) specsToSearch = [...specsToSearch, ...parsed];
			} catch (e) { }
		}
		// From 'sizes' array (e.g. "5x10x15mm")
		if (Array.isArray(p.sizes)) {
			p.sizes.forEach((s: any) => {
				if (typeof s === 'string') specsToSearch.push({ label: 'size', value: s });
			});
		}

		specsToSearch.forEach((spec: any) => {
			const label = (spec.label || '').toLowerCase();
			const valStr = String(spec.value || '').toLowerCase();
			const val = parseFloat(valStr.replace(/[^\d.]/g, ''));

			if (!isNaN(val) && val > 0) {
				if (l === 0 && (label.includes('length') || label === 'l')) l = val;
				else if (wid === 0 && (label.includes('width') || label === 'w')) wid = val;
				else if (h === 0 && (label.includes('height') || label === 'h')) h = val;
			}

			if (label.includes('dimension') || label === 'size') {
				const parts = valStr.split(/[x*]/).map((s: string) => parseFloat(s.trim()));
				if (parts.length === 3 && parts.every((n: number) => !isNaN(n))) {
					let multiplier = 1;
					if (valStr.includes('mm')) multiplier = 0.1;
					else if (valStr.includes('m') && !valStr.includes('mm') && !valStr.includes('cm')) multiplier = 100;
					else if (valStr.includes('in') || valStr.includes('"')) multiplier = 2.54;

					if (l === 0) l = parts[0] * multiplier;
					if (wid === 0) wid = parts[1] * multiplier;
					if (h === 0) h = parts[2] * multiplier;
				}
			}
		});

		// 3. Fallback
		if (l <= 0) l = 1;
		if (wid <= 0) wid = 1;
		if (h <= 0) h = 1;

		return { length: l, width: wid, height: h, unit };
	}

	/**
	 * POST /api/v1/cart/items
	 * Add item to cart
	 */
	async addItem(req: NextRequest) {
		try {
			const { userId, sessionId } = await this.getContext(req);
			if (!userId && !sessionId) {
				return this.sendError('Session ID or Auth Token required', 400);
			}

			const body = await req.json();
			const { productId, quantity } = body;

			if (!productId || !quantity || quantity < 1) {
				return this.sendError('Invalid product or quantity', 400);
			}

			const { eligible, error: eligibilityError } = await this.checkProductPurchaseEligibility(productId);
			if (!eligible) {
				return this.sendError(eligibilityError || 'This product is currently unavailable', 400);
			}

			const cart = await this.findOrCreateCart(userId, sessionId);
			if (!cart) return this.sendError('Cart error', 500);

			let item = await CartItem.findOne({
				where: { cart_id: cart.id, product_id: productId }
			});

			if (item) {
				await item.update({ quantity: item.quantity + quantity });
			} else {
				item = await CartItem.create({
					cart_id: cart.id,
					product_id: productId,
					quantity
				});
			}

			return this.sendSuccess({ message: 'Item added', item });
		} catch (error: any) {
			if (error.message === 'TOKEN_EXPIRED') return this.sendError('Token expired', 210, [], undefined, req);
			if (error.message === 'TOKEN_MISSING') return this.sendError('Authentication required', 210, [], undefined, req);
			return this.sendError(String((error as any).message), 500, [], undefined, req);
		}
	}

	/**
	 * PUT /api/v1/cart/items/:itemId
	 * Update item quantity
	 */
	async updateItem(req: NextRequest, context: { params: { itemId: string } }) {
		try {
			const { userId, sessionId } = await this.getContext(req);
			if (!userId && !sessionId) {
				return this.sendError('Session ID or Auth Token required', 400);
			}

			const body = await req.json();
			const { quantity } = body;

			if (!quantity || quantity < 1) {
				return this.removeItem(req, context);
			}

			const cart = await this.findOrCreateCart(userId, sessionId);
			const item = await CartItem.findOne({
				where: { id: context.params.itemId, cart_id: cart!.id }
			});

			if (!item) {
				return this.sendError('Item not found', 404);
			}

			await item.update({ quantity });

			return this.sendSuccess({ message: 'Cart updated', item });
		} catch (error: any) {
			if (error.message === 'TOKEN_EXPIRED') return this.sendError('Token expired', 210, [], undefined, req);
			if (error.message === 'TOKEN_MISSING') return this.sendError('Authentication required', 210, [], undefined, req);
			return this.sendError(String((error as any).message), 500, [], undefined, req);
		}
	}

	/**
	 * DELETE /api/v1/cart/items/:itemId
	 * Remove item
	 */
	async removeItem(req: NextRequest, context: { params: { itemId: string } }) {
		try {
			const { userId, sessionId } = await this.getContext(req);
			if (!userId && !sessionId) {
				return this.sendError('Session ID or Auth Token required', 400);
			}

			const cart = await this.findOrCreateCart(userId, sessionId);
			const item = await CartItem.findOne({
				where: { id: context.params.itemId, cart_id: cart!.id }
			});

			if (item) {
				await item.destroy();
			}

			return this.sendSuccess({ message: 'Item removed' });
		} catch (error: any) {
			if (error.message === 'TOKEN_EXPIRED') return this.sendError('Token expired', 210, [], undefined, req);
			if (error.message === 'TOKEN_MISSING') return this.sendError('Authentication required', 210, [], undefined, req);
			return this.sendError(String((error as any).message), 500, [], undefined, req);
		}
	}

	/**
	 * POST /api/v1/cart/merge
	 * Merge Guest Cart into User Cart (Call after login)
	 */
	async mergeCart(req: NextRequest) {
		try {
			const { userId, sessionId } = await this.getContext(req);
			if (!userId) return this.sendError('Authentication required', 401);
			if (!sessionId) return this.sendError('Session ID required', 400);

			// Find Guest Cart
			const guestCart = await Cart.findOne({
				where: { session_id: sessionId, user_id: null, status: 'active' }
			});

			if (!guestCart) {
				return this.sendSuccess({ message: 'No guest cart to merge' });
			}

			// Find or Create User Cart
			let userCart = await Cart.findOne({
				where: { user_id: userId, status: 'active' }
			});

			if (!userCart) {
				// Convert guest cart to user cart
				await guestCart.update({ user_id: userId, session_id: null });
				return this.sendSuccess({ message: 'Cart merged successfully' });
			}

			// Merge Items from Guest Cart to User Cart
			const guestItems = await CartItem.findAll({ where: { cart_id: guestCart.id } });

			for (const guestItem of guestItems) {
				const existingItem = await CartItem.findOne({
					where: { cart_id: userCart.id, product_id: guestItem.product_id }
				});

				if (existingItem) {
					await existingItem.update({ quantity: existingItem.quantity + guestItem.quantity });
				} else {
					await CartItem.create({
						cart_id: userCart.id,
						product_id: guestItem.product_id,
						quantity: guestItem.quantity
					});
				}
			}

			// Delete guest cart (items will be deleted by cascade or we delete manually)
			await CartItem.destroy({ where: { cart_id: guestCart.id } });
			await guestCart.destroy(); // Soft delete if paranoid, or hard delete

			return this.sendSuccess({ message: 'Cart merged successfully' });
		} catch (error: any) {
			if (error.message === 'TOKEN_EXPIRED') return this.sendError('Token expired', 210, [], undefined, req);
			if (error.message === 'TOKEN_MISSING') return this.sendError('Authentication required', 210, [], undefined, req);
			return this.sendError(String((error as any).message), 500, [], undefined, req);
		}
	}
}
