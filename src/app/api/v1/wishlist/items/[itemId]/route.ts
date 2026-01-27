import { NextRequest } from 'next/server';
import { WishlistController } from '@/controllers/WishlistController';

const controller = new WishlistController();

/**
 * @swagger
 * /api/v1/wishlist/items/{itemId}:
 *   delete:
 *     tags: [Wishlist]
 *     summary: Remove item from wishlist
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Item removed
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ itemId: string }> }) {
    const params = await props.params;
    return controller.removeItem(req, { params });
}
