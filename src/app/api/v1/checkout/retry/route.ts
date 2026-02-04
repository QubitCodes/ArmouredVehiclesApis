
import { NextRequest } from 'next/server';
import { CheckoutController } from '@/controllers/CheckoutController';

const controller = new CheckoutController();

/**
 * @swagger
 * /checkout/retry:
 *   post:
 *     summary: Retry payment for an existing Order Group
 *     tags: [Checkout]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderGroupId
 *             properties:
 *               orderGroupId:
 *                 type: string
 *                 description: The Order Group ID to retry payment for
 *     responses:
 *       200:
 *         description: Payment session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentUrl:
 *                   type: string
 */
export async function POST(req: NextRequest) {
    const formData = await req.formData().catch(() => new FormData());
    const data = Object.fromEntries(formData.entries());
    return controller.retryPayment(req, data);
}
