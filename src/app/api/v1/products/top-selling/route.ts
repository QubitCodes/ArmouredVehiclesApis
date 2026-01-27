import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

const controller = new ProductController();

/**
 * @swagger
 * /api/v1/products/top-selling:
 *   get:
 *     tags: [Products]
 *     summary: Get top selling products
 *     description: Returns top rated/ordered products
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List of top selling products
 */
export async function GET(req: NextRequest) {
	return controller.listTopSelling(req);
}
