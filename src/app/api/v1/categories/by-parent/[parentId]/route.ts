import { NextRequest } from 'next/server';
import { CategoryController } from '@/controllers/CategoryController';

const controller = new CategoryController();

/**
 * @swagger
 * /api/v1/categories/by-parent/{parentId}:
 *   get:
 *     tags: [Categories]
 *     summary: Get subcategories by parent ID
 *     description: Returns all categories that have the specified parent ID
 *     parameters:
 *       - in: path
 *         name: parentId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of subcategories
 *       400:
 *         description: Invalid parent ID
 */
export async function GET(
	req: NextRequest,
	context: { params: Promise<{ parentId: string }> }
) {
	const params = await context.params;
	return controller.listByParent(req, { params });
}
