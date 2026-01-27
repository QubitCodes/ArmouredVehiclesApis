import { NextRequest } from 'next/server';
import { CategoryController } from '@/controllers/CategoryController';

const controller = new CategoryController();

/**
 * @swagger
 * /api/v1/categories/{id}/hierarchy:
 *   get:
 *     tags: [Categories]
 *     summary: Get category hierarchy path
 *     description: Returns the full path from main category to the specified category
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Category hierarchy path
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *       400:
 *         description: Invalid category ID
 */
export async function GET(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const params = await context.params;
	return controller.getHierarchy(req, { params });
}
