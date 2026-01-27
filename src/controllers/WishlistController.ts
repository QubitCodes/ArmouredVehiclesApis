
import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { Wishlist, WishlistItem, Product, ProductMedia } from '../models';
import { verifyAccessToken } from '../utils/jwt';

export class WishlistController extends BaseController {

	private async getContext(req: NextRequest) {
		const authHeader = req.headers.get('authorization');
		let userId: string | null = null;
		let sessionId: string | null = req.headers.get('x-session-id');

		if (authHeader && authHeader.startsWith('Bearer ')) {
			try {
				const token = authHeader.split(' ')[1];
				const decoded: any = verifyAccessToken(token);
				if (decoded && decoded.sub) {
					userId = decoded.sub;
				}
			} catch (e) { }
		}
		return { userId, sessionId };
	}

	private async findOrCreateWishlist(userId: string | null, sessionId: string | null) {
		if (!userId && !sessionId) return null;

		const whereClause: any = {};
		if (userId) {
			whereClause.user_id = userId;
		} else {
			whereClause.session_id = sessionId;
			whereClause.user_id = null;
		}

		let wishlist = await Wishlist.findOne({ where: whereClause });

		if (!wishlist) {
			wishlist = await Wishlist.create({
				user_id: userId,
				session_id: sessionId
			});
		}
		return wishlist;
	}

	async getWishlist(req: NextRequest) {
		try {
			const { userId, sessionId } = await this.getContext(req);
			if (!userId && !sessionId) return this.sendError('Session ID or Auth Token required', 400);

			const wishlist = await this.findOrCreateWishlist(userId, sessionId);
			if (!wishlist) return this.sendError('Error retrieving wishlist', 500);

			const items = await WishlistItem.findAll({
				where: { wishlist_id: wishlist.id },
				include: [{
					model: Product,
					as: 'product',
					include: [{ model: ProductMedia, as: 'media', limit: 1 }]
				}]
			});

			return this.sendSuccess({ wishlist, items });
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}

	async addItem(req: NextRequest) {
		try {
			const { userId, sessionId } = await this.getContext(req);
			if (!userId && !sessionId) return this.sendError('Session ID or Auth Token required', 400);

			const body = await req.json();
			const { productId } = body;

			if (!productId) return this.sendError('Product ID required', 400);

			const wishlist = await this.findOrCreateWishlist(userId, sessionId);
			
			const existing = await WishlistItem.findOne({
				where: { wishlist_id: wishlist!.id, product_id: productId }
			});

			if (existing) {
				return this.sendSuccess({ message: 'Item already in wishlist', item: existing });
			}

			const item = await WishlistItem.create({
				wishlist_id: wishlist!.id,
				product_id: productId
			});

			return this.sendSuccess({ item }, 'Added to wishlist', 201);
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}

	async removeItem(req: NextRequest, context: { params: { itemId: string } }) {
		try {
			const { userId, sessionId } = await this.getContext(req);
			if (!userId && !sessionId) return this.sendError('Session ID or Auth Token required', 400);

			const wishlist = await this.findOrCreateWishlist(userId, sessionId);
			const item = await WishlistItem.findOne({
				where: { id: context.params.itemId, wishlist_id: wishlist!.id }
			});

			if (item) await item.destroy();

			return this.sendSuccess({ message: 'Item removed' });
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}

	async mergeWishlist(req: NextRequest) {
		try {
			const { userId, sessionId } = await this.getContext(req);
			if (!userId) return this.sendError('Authentication required', 401);
			if (!sessionId) return this.sendError('Session ID required', 400);

			const guestWishlist = await Wishlist.findOne({
				where: { session_id: sessionId, user_id: null }
			});

			if (!guestWishlist) return this.sendSuccess({ message: 'No guest wishlist to merge' });

			let userWishlist = await Wishlist.findOne({ where: { user_id: userId } });

			if (!userWishlist) {
				await guestWishlist.update({ user_id: userId, session_id: null });
				return this.sendSuccess({ message: 'Wishlist merged' });
			}

			const guestItems = await WishlistItem.findAll({ where: { wishlist_id: guestWishlist.id } });

			for (const item of guestItems) {
				const existing = await WishlistItem.findOne({
					where: { wishlist_id: userWishlist.id, product_id: item.product_id }
				});
				if (!existing) {
					await WishlistItem.create({
						wishlist_id: userWishlist.id,
						product_id: item.product_id
					});
				}
			}

			await WishlistItem.destroy({ where: { wishlist_id: guestWishlist.id } });
			await guestWishlist.destroy();

			return this.sendSuccess({ message: 'Wishlist merged' });
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}
}
