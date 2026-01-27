
import { NextRequest } from 'next/server';
import { AdminOrderController } from '@/controllers/AdminOrderController';

/**
 * @swagger
 * /api/v1/admin/orders:
 *   get:
 *     tags: [Admin]
 *     summary: List all orders
 *     description: Retrieve paginated orders with filtering logic.
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, processing, shipped, delivered, cancelled, returned, approved, pending_approval] }
 *       - in: query
 *         name: compliance_status
 *         schema: { type: string, enum: [pending, approved, rejected] }
 *       - in: query
 *         name: vendor_id
 *         schema: { type: string }
 *       - in: query
 *         name: payment_status
 *         schema: { type: string, enum: [pending, paid, failed, refunded] }
 *       - in: query
 *         name: shipment_status
 *         schema: { type: string, enum: [pending, processing, shipped, delivered, returned, cancelled] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by Order ID, User Name or Email
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Order' } }
 *                 misc:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     pages: { type: integer }
 */
export async function GET(req: NextRequest) {
  return AdminOrderController.getOrders(req);
}
