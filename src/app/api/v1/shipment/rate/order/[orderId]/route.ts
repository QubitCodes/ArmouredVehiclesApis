/**
 * @swagger
 * /api/v1/shipment/rate/order/{orderId}:
 *   post:
 *     summary: Calculate shipping rates for a specific order
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weight:
 *                 type: object
 *     responses:
 *       200:
 *         description: Rates calculated successfully
 */

import { NextRequest } from 'next/server';
import { ShipmentController } from '@/controllers/ShipmentController';

const controller = new ShipmentController();

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ orderId: string }> }
) {
    const params = await props.params;
    return controller.calculateOrderRate(req, { params });
}
