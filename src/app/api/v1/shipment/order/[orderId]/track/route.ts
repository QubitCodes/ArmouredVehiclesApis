/**
 * @swagger
 * /api/v1/shipment/order/{orderId}/track:
 *   get:
 *     summary: Track shipment for a specific order
 *     tags: [Shipment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order tracking information retrieved successfully
 */

import { NextRequest } from 'next/server';
import { ShipmentController } from '@/controllers/ShipmentController';

const controller = new ShipmentController();

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ orderId: string }> }
) {
    const params = await props.params;
    return controller.trackOrderShipment(req, { params });
}
