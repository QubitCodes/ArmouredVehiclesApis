import { NextRequest } from 'next/server';
import { CategoryController } from '@/controllers/CategoryController';

const controller = new CategoryController();

/**
 * @swagger
 * /api/v1/categories/main:
 *   get:
 *     tags: [Categories]
 *     summary: Get all main categories (level 0)
 *     description: Returns all categories with no parent (parentId is null)
 *     responses:
 *       200:
 *         description: List of main categories
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
 */
export async function GET(req: NextRequest) {
	return controller.listMain(req);
}
