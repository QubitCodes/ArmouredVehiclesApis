
import { NextRequest } from 'next/server';
import { AdminOrderController } from '@/controllers/AdminOrderController';

/**
 * @swagger
 * /api/v1/admin/vendors/{id}/orders/{orderId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get details of a specific order for a vendor
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order details
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string, orderId: string }> }) {
  const params = await props.params;
  return AdminOrderController.getVendorOrder(req, { params });
}
