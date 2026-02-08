/**
 * FedEx Webhook Route Handler
 * 
 * POST /api/v1/shipment/webhook
 * Receives tracking events from FedEx and updates order status automatically.
 * 
 * This endpoint should be registered in FedEx Developer Portal under Track API.
 * 
 * @module app/api/v1/shipment/webhook/route
 */

import { NextRequest } from 'next/server';
import { ShipmentController } from '@/controllers/ShipmentController';

const controller = new ShipmentController();

/**
 * @swagger
 * /api/v1/shipment/webhook:
 *   post:
 *     summary: FedEx Tracking Webhook
 *     description: Receives tracking events from FedEx and updates order shipment status automatically.
 *     tags:
 *       - Shipment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               trackingNumber:
 *                 type: string
 *                 example: "794644790138"
 *               eventType:
 *                 type: string
 *                 example: "PK"
 *               eventDescription:
 *                 type: string
 *                 example: "Picked up"
 *               eventTimestamp:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Webhook received successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     received:
 *                       type: boolean
 *                     order_id:
 *                       type: string
 *                     new_status:
 *                       type: string
 */
export async function POST(req: NextRequest) {
    return controller.handleWebhook(req);
}
