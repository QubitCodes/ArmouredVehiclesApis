
import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

const productController = new ProductController();

/**
 * @swagger
 * /api/v1/admin/products/{id}/attributes:
 *   patch:
 *     summary: Toggle product attributes (featured, top_selling)
 *     tags: [Admin - Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_featured:
 *                 type: boolean
 *               is_top_selling:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Attributes updated successfully
 *       400:
 *         description: Validation error (limit reached or no image)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    return productController.toggleAttributes(req, { params });
}
