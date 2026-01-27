import { NextRequest } from 'next/server';
import { CategoryController } from '@/controllers/CategoryController';

const controller = new CategoryController();

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     tags: [Categories]
 *     summary: Get all categories
 *     description: Returns a list of all product categories for navigation
 *     responses:
 *       200:
 *         description: List of categories
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
	return controller.list(req);
}

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a new category (Admin only)
 *     description: |
 *       Create a new category. Supports up to 2 levels of nesting:
 *       - Level 0: Main category (parentId is null)
 *       - Level 1: Category (parentId references main category)
 *       - Level 2: Subcategory (parentId references category)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, image]
 *             properties:
 *               name: { type: string }
 *               image: { type: string }
 *               description: { type: string, nullable: true }
 *               parentId: { type: integer, nullable: true }
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error or max nesting level exceeded
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin only
 */
export async function POST(req: NextRequest) {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const data: any = {};
        const files: File[] = [];

        formData.forEach((value, key) => {
            if (value instanceof File) {
                files.push(value);
            } else {
                data[key] = value;
            }
        });

        return controller.create(req, { data, files });
    }
	return controller.create(req);
}
