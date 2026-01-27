
import { NextRequest } from 'next/server';
import { AdminOrderController } from '@/controllers/AdminOrderController';

/**
 * @swagger
 * /api/v1/admin/vendors/{id}/orders:
 *   get:
 *     tags: [Admin]
 *     summary: List orders for a specific vendor
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: payment_status
 *         schema: { type: string }
 *       - in: query
 *         name: shipment_status
 *         schema: { type: string }
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
 *         description: List of vendor orders
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
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return AdminOrderController.getVendorOrders(req, { params });
}
