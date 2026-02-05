/**
 * @swagger
 * /api/v1/shipment/track/{trackingNumber}:
 *   get:
 *     summary: Track a shipment by tracking number
 *     tags: [Shipment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tracking information retrieved successfully
 */

import { NextRequest } from 'next/server';
import { ShipmentController } from '@/controllers/ShipmentController';

const controller = new ShipmentController();

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ trackingNumber: string }> }
) {
    const params = await props.params;
    return controller.trackShipment(req, { params });
}
