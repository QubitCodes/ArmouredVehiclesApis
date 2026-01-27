import { NextRequest } from 'next/server';
import { FiltersController } from '@/controllers/FiltersController';

const controller = new FiltersController();

/**
 * @swagger
 * /api/v1/products/filters:
 *   get:
 *     tags: [Products]
 *     summary: Get product filter options
 *     description: |
 *       Returns available filter options for the product listing sidebar.
 *       Includes price range, categories with counts, conditions, materials, and origins.
 *     responses:
 *       200:
 *         description: Filter options
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 priceRange:
 *                   type: object
 *                   properties:
 *                     min: { type: number }
 *                     max: { type: number }
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       name: { type: string }
 *                       parentId: { type: integer, nullable: true }
 *                       productCount: { type: integer }
 *                 conditions:
 *                   type: array
 *                   items: { type: string }
 *                 materials:
 *                   type: array
 *                   items: { type: string }
 *                 origins:
 *                   type: array
 *                   items: { type: string }
 *                 vendorCount:
 *                   type: integer
 */
export async function GET(req: NextRequest) {
	return controller.getProductFilters(req);
}
