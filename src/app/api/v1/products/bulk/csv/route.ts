import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

const controller = new ProductController();

/**
 * @swagger
 * /api/v1/products/bulk/csv:
 *   post:
 *     tags: [Products]
 *     summary: Bulk create products from CSV
 *     description: |
 *       Upload a CSV file to create multiple products.
 *       Headers: name, description, sku, base_price, category_id.
 *       - Vendors: products created for self.
 *       - Admins: can use `vendorId` field in form-data to assign owner.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               vendorId:
 *                 type: string
 *                 format: uuid
 *                 description: (Admin only) Assign to vendor
 *     responses:
 *       201:
 *         description: Bulk create completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count: { type: integer }
 *                 products: { type: array }
 *                 errors: { type: array }
 *       400:
 *         description: Validation error or invalid file
 *       403:
 *         description: Forbidden
 */
export async function POST(req: NextRequest) {
	return controller.bulkCreateFromCsv(req);
}
