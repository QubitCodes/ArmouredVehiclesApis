
import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

/**
 * @swagger
 * /admin/products/{id}/approval:
 *   patch:
 *     summary: Approve or Reject a product
 *     tags: [Admin, Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *               rejection_reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Product status updated
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Product not found
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return new ProductController().approve(req, { params });
}
