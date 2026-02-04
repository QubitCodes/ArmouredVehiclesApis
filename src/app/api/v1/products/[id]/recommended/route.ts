import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

const controller = new ProductController();

/**
 * @swagger
 * /api/v1/products/{id}/recommended:
 *   get:
 *     tags: [Products]
 *     summary: Get recommended products
 *     description: Returns personalized product recommendations
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 6 }
 *     responses:
 *       200:
 *         description: List of recommended products
 */
export async function GET(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const params = await context.params;
	return controller.getRecommended(req, { params });
}
