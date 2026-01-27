import { NextRequest } from 'next/server';
import { CategoryController } from '@/controllers/CategoryController';

const controller = new CategoryController();

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   get:
 *     tags: [Categories]
 *     summary: Get category by ID
 *     description: Returns a single category with its parent and children
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Category details
 *       400:
 *         description: Invalid category ID
 *       404:
 *         description: Category not found
 */
export async function GET(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const params = await context.params;
	return controller.getById(req, { params });
}

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   put:
 *     tags: [Categories]
 *     summary: Update a category (Admin only)
 *     description: Update category details. Cannot change parentId if it would exceed max nesting level
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               image: { type: string }
 *               description: { type: string, nullable: true }
 *               parentId: { type: integer, nullable: true }
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin only
 *       404:
 *         description: Category not found
 */
export async function PUT(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const params = await context.params;
    
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

        return controller.update(req, { params, parsedData: { data, files } });
    }

	return controller.update(req, { params });
}

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category (Admin only)
 *     description: Delete a category. Cannot delete if it has subcategories or products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Category deleted successfully
 *       400:
 *         description: Cannot delete - has subcategories or products
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin only
 *       404:
 *         description: Category not found
 */
export async function DELETE(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const params = await context.params;
	return controller.delete(req, { params });
}
