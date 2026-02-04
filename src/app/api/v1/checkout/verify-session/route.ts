
import { NextRequest } from 'next/server';
import { CheckoutController } from '@/controllers/CheckoutController';

/**
 * @swagger
 * /api/v1/checkout/verify-session:
 *   post:
 *     tags:
 *       - Checkout
 *     summary: Verify Stripe Session and Confirm Order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *               orderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Session verified
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
 *                         success: { type: boolean }
 *                         orderId: { type: string }
 */
export async function POST(req: NextRequest) {
  const controller = new CheckoutController();
  const formData = await req.formData().catch(() => new FormData());
  const data = Object.fromEntries(formData.entries());
  return controller.verifySession(req, data);
}
