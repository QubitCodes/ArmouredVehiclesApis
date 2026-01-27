
import { NextRequest } from 'next/server';
import { AdminOrderController } from '@/controllers/AdminOrderController';

/**
 * @swagger
 * /api/v1/admin/orders/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get order details
 *     description: Retrieve detailed order information.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  return AdminOrderController.getOrder(req, { params });
}

/**
 * @swagger
 * /api/v1/admin/orders/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Update Order
 *     description: Update order status, payment, shipment, and metadata.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               order_status: { type: string, enum: [pending_review, pending_approval, approved, rejected, cancelled] }
 *               comments: { type: string }
 *               payment_status: { type: string, enum: [pending, paid, failed, refunded], nullable: true }
 *               shipment_status: { type: string, enum: [pending, processing, shipped, delivered, returned, cancelled], nullable: true }
 *               shipment_details: { type: object }
 *               transaction_details: { type: object }
 *               tracking_number: { type: string }
 *     responses:
 *       200:
 *         description: Order updated
 */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  return AdminOrderController.updateOrder(req, { params });
}
