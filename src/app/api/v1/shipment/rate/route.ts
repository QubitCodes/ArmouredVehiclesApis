/**
 * @swagger
 * /api/v1/shipment/rate:
 *   post:
 *     summary: Calculate shipping rates
 *     tags: [Shipment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fromAddress:
 *                 type: object
 *               fromContact:
 *                 type: object
 *               toAddress:
 *                 type: object
 *               toContact:
 *                 type: object
 *               weight:
 *                 type: object
 *     responses:
 *       200:
 *         description: Rates calculated successfully
 */

import { NextRequest } from 'next/server';
import { ShipmentController } from '@/controllers/ShipmentController';

const controller = new ShipmentController();

export async function POST(req: NextRequest) {
    return controller.calculateRate(req);
}
