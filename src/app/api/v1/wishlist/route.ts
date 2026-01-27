import { NextRequest } from 'next/server';
import { WishlistController } from '@/controllers/WishlistController';

const controller = new WishlistController();

/**
 * @swagger
 * /api/v1/wishlist:
 *   get:
 *     tags: [Wishlist]
 *     summary: Get current wishlist
 *     description: Returns the current user's wishlist with all items and product details
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         schema: { type: string }
 *         description: Session ID for guest users
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Wishlist details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Wishlist'
 */
export async function GET(req: NextRequest) {
    return controller.getWishlist(req);
}
