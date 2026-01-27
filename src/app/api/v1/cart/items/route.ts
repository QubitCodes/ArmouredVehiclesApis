import { NextRequest } from 'next/server';
import { CartController } from '@/controllers/CartController';

const controller = new CartController();

/**
 * @swagger
 * /api/v1/cart/items:
 *   post:
 *     tags: [Cart]
 *     summary: Add item to cart
 *     description: Adds a product to the shopping cart with specified quantity
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
 *             required: [productId, quantity]
 *             properties:
 *               productId: { type: integer, description: Product ID to add }
 *               quantity: { type: integer, minimum: 1, description: Quantity to add }
 *     responses:
 *       200:
 *         description: Item added to cart
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Validation error or insufficient stock
 */
export async function POST(req: NextRequest) {
    return controller.addItem(req);
}
