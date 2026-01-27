
import { NextRequest } from 'next/server';
import { AdminController } from '@/controllers/AdminController';

/**
 * @swagger
 * /api/v1/admin/customers/{id}/orders:
 *   get:
 *     tags: [Admin]
 *     summary: Get customer's orders
 *     description: |
 *       Retrieve a paginated list of orders for a specific customer.
 *       - **Admins**: See all orders
 *       - **Vendors**: Only see orders containing their products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Customer user ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, shipped, delivered, cancelled]
 *         description: Filter by order status
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of customer's orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       status: { type: string }
 *                       total_amount: { type: number }
 *                       items: { type: array }
 *                 misc:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     pages: { type: integer }
 *       404:
 *         description: Customer not found
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return AdminController.getCustomerOrders(req, { params });
}
