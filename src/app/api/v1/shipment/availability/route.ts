/**
 * @swagger
 * /api/v1/shipment/availability:
 *   get:
 *     summary: Check if FedEx shipping service is available
 *     tags: [Shipment]
 *     responses:
 *       200:
 *         description: FedEx availability status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 configured:
 *                   type: boolean
 *                 valid:
 *                   type: boolean
 */

import { NextRequest } from 'next/server';
import { ShipmentController } from '@/controllers/ShipmentController';

const controller = new ShipmentController();

export async function GET(req: NextRequest) {
    return controller.checkAvailability(req);
}
