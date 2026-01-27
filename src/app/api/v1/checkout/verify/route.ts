import { NextRequest } from 'next/server';
import { CheckoutController } from '@/controllers/CheckoutController';

const controller = new CheckoutController();

/**
 * @swagger
 * /api/v1/checkout/verify:
 *   post:
 *     tags: [Checkout]
 *     summary: Verify if cart requires approval or checks out directly
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Check result
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
 *                         requiresApproval: { type: boolean }
 */
export async function POST(req: NextRequest) {
    return controller.verifyCheckout(req);
}
