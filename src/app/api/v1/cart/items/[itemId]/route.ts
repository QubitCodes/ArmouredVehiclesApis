import { NextRequest } from 'next/server';
import { CartController } from '@/controllers/CartController';

const controller = new CartController();

/**
 * @swagger
 * /api/v1/cart/items/{itemId}:
 *   put:
 *     tags: [Cart]
 *     summary: Update cart item quantity
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity: { type: integer }
 *     responses:
 *       200:
 *         description: Item updated
 *   delete:
 *     tags: [Cart]
 *     summary: Remove item from cart
 *     responses:
 *       200:
 *         description: Item removed
 */
export async function PUT(req: NextRequest, props: { params: Promise<{ itemId: string }> }) {
    const params = await props.params;
    return controller.updateItem(req, { params });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ itemId: string }> }) {
    const params = await props.params;
    return controller.removeItem(req, { params });
}
