
import { NextRequest } from 'next/server';
import { AdminController } from '@/controllers/AdminController';

/**
 * @swagger
 * /api/v1/admin/customers/{id}/orders/{orderId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get specific order details
 *     description: |
 *       Retrieve detailed information for a specific customer order.
 *       - **Admins**: Full order details
 *       - **Vendors**: Only accessible if order contains their products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Customer user ID
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     status: { type: string }
 *                     total_amount: { type: number }
 *                     items: { type: array }
 *                     user:
 *                       type: object
 *                       description: Customer info (limited for vendors)
 *       404:
 *         description: Order not found
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string; orderId: string }> }) {
  const params = await props.params;
  return AdminController.getCustomerOrder(req, { params });
}
