import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

const controller = new ProductController();

/**
 * @swagger
 * /api/v1/products/featured:
 *   get:
 *     tags: [Products]
 *     summary: Get featured products
 *     description: Returns products marked as featured for homepage display
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List of featured products
 */
export async function GET(req: NextRequest) {
	return controller.listFeatured(req);
}
