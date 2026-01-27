import { NextRequest } from 'next/server';
import { CategoryController } from '@/controllers/CategoryController';

const controller = new CategoryController();

/**
 * @swagger
 * /api/v1/categories/search:
 *   get:
 *     tags: [Categories]
 *     summary: Search categories by name
 *     description: Search for categories by name with optional parent ID filter
 *     parameters:
 *       - in: query
 *         name: name
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: parentId
 *         required: false
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of matching categories
 *       400:
 *         description: Missing or invalid query
 */
export async function GET(req: NextRequest) {
	return controller.search(req);
}
