import { NextRequest } from 'next/server';
import { CartController } from '@/controllers/CartController';

const controller = new CartController();

/**
 * @swagger
 * /api/v1/cart/merge:
 *   post:
 *     tags: [Cart]
 *     summary: Merge guest cart into user cart
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cart merged
 */
export async function POST(req: NextRequest) {
    return controller.mergeCart(req);
}
