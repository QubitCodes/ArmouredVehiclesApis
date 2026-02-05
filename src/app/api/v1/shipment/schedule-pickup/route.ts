/**
 * @swagger
 * /api/v1/shipment/schedule-pickup:
 *   post:
 *     summary: Schedule a FedEx pickup for an order
 *     tags: [Shipment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - pickupDate
 *               - readyTime
 *               - closeTime
 *               - weight
 *             properties:
 *               orderId:
 *                 type: string
 *                 format: uuid
 *               pickupDate:
 *                 type: string
 *                 format: date
 *               readyTime:
 *                 type: string
 *                 example: "09:00"
 *               closeTime:
 *                 type: string
 *                 example: "17:00"
 *               packageCount:
 *                 type: integer
 *                 default: 1
 *               weight:
 *                 type: object
 *                 properties:
 *                   units:
 *                     type: string
 *                     enum: [KG, LB]
 *                   value:
 *                     type: number
 *     responses:
 *       200:
 *         description: Pickup scheduled successfully
 */

import { NextRequest } from 'next/server';
import { ShipmentController } from '@/controllers/ShipmentController';

const controller = new ShipmentController();

export async function POST(req: NextRequest) {
    return controller.schedulePickup(req);
}
