import { NextRequest } from 'next/server';
import { CheckoutController } from '@/controllers/CheckoutController';

const controller = new CheckoutController();

/**
 * @swagger
 * /api/v1/checkout/create:
 *   post:
 *     tags: [Checkout]
 *     summary: Create an Order (Direct OR Purchase Request)
 *     description: Automatically creates a Direct Order or Purchase Request based on backend compliance rules.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Order created successfully
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
 *                         orderId: { type: string }
 *                         type: { type: string, enum: [direct, request] }
 *                         requiresApproval: { type: boolean }
 *                         paymentUrl: { type: string, nullable: true }
 */
export async function POST(req: NextRequest) {
    const contentType = req.headers.get('content-type') || '';
    let data: any = {};

    if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData().catch(() => new FormData());
        data = Object.fromEntries(formData.entries());
    } else {
        data = await req.json().catch(() => ({}));
    }

    return controller.create(req, data);
}
