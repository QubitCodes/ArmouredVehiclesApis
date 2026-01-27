
import { NextRequest } from 'next/server';
import { VendorOrderController } from '@/controllers/VendorOrderController';

/**
 * @swagger
 * /api/v1/vendor/orders/{id}/fulfill:
 *   put:
 *     tags: [Vendor]
 *     summary: Fulfill Order Items
 *     description: Mark specific items or order as shipped.
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
 *             required: [item_ids]
 *             properties:
 *               item_ids: 
 *                 type: array
 *                 items: { type: integer }
 *     responses:
 *       200:
 *         description: Items marked as shipped
 */
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return VendorOrderController.fulfillItem(req, { params });
}
