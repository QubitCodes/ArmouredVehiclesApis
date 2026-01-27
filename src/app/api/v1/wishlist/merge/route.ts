import { NextRequest } from 'next/server';
import { WishlistController } from '@/controllers/WishlistController';

const controller = new WishlistController();

/**
 * @swagger
 * /api/v1/wishlist/merge:
 *   post:
 *     tags: [Wishlist]
 *     summary: Merge guest wishlist into user wishlist
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Wishlist merged
 */
export async function POST(req: NextRequest) {
    return controller.mergeWishlist(req);
}
