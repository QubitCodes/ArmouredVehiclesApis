import { NextRequest } from 'next/server';
import { CartController } from '@/controllers/CartController';

const controller = new CartController();

/**
 * @swagger
 * /api/v1/cart:
 *   get:
 *     tags: [Cart]
 *     summary: Get current cart
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         schema: { type: string }
 *         description: Guest Session I
 *     responses:
 *       200:
 *         description: Cart details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         items: { type: array }
 *                         total: { type: number }
 */
export async function GET(req: NextRequest) {
    return controller.getCart(req);
}
