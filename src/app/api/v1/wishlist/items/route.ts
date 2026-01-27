import { NextRequest } from 'next/server';
import { WishlistController } from '@/controllers/WishlistController';

const controller = new WishlistController();

/**
 * @swagger
 * /api/v1/wishlist/items:
 *   post:
 *     tags: [Wishlist]
 *     summary: Add item to wishlist
 *     description: Adds a product to the user's wishlist
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         schema: { type: string }
 *         description: Session ID for guest users
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId: { type: integer, description: Product ID to add }
 *     responses:
 *       201:
 *         description: Item added to wishlist
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/WishlistItem'
 *       409:
 *         description: Item already in wishlist
 */
export async function POST(req: NextRequest) {
    return controller.addItem(req);
}
