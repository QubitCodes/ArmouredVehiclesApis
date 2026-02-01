
import { NextRequest } from 'next/server';
import { VendorOrderController } from '@/controllers/VendorOrderController';

const controller = new VendorOrderController();

/**
 * @swagger
 * /api/v1/vendor/orders/{id}/fulfill:
 *   put:
 *     tags: [Vendor Order]
 *     summary: Fulfill order items
 *     description: Mark specific items or the entire order as shipped.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - item_ids
 *             properties:
 *               item_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of Order Item IDs to fulfill
 *     responses:
 *       200:
 *         description: Order fulfilled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid items
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return controller.fulfillItem(req, { params });
}
