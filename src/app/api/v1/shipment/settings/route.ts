/**
 * @swagger
 * /api/v1/shipment/settings:
 *   get:
 *     summary: Get shipment-related platform settings
 *     tags: [Shipment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shipment settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 handle_vendor_shipment:
 *                   type: boolean
 *                 handle_return_shipment:
 *                   type: boolean
 *                 vendor_shipment_pay:
 *                   type: string
 *                   enum: [vendor, admin]
 *                 return_shipment_pay:
 *                   type: string
 *                   enum: [admin, customer]
 */

import { NextRequest } from 'next/server';
import { ShipmentController } from '@/controllers/ShipmentController';

const controller = new ShipmentController();

export async function GET(req: NextRequest) {
    return controller.getShipmentSettings(req);
}
