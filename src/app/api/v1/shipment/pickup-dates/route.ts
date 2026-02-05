/**
 * @swagger
 * /api/v1/shipment/pickup-dates:
 *   get:
 *     summary: Get available pickup dates
 *     tags: [Shipment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pickup dates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dates:
 *                   type: array
 *                   items:
 *                     type: string
 *                     format: date
 */

import { NextRequest } from 'next/server';
import { ShipmentController } from '@/controllers/ShipmentController';

const controller = new ShipmentController();

export async function GET(req: NextRequest) {
    return controller.getPickupDates(req);
}
