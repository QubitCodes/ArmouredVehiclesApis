import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

const controller = new ProductController();

/**
 * @swagger
 * /api/v1/products/bulk:
 *   post:
 *     tags: [Products]
 *     summary: Bulk create products
 *     description: |
 *       Create multiple products in a single request.
 *       - Vendors: products will be created under the authenticated vendor's account.
 *       - Admins: pass `vendorId` to assign to a vendor, or omit for admin-owned products.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [products]
 *             properties:
 *               vendorId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Vendor UUID (admin only). If null, products are admin-owned.
 *               products:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [name]
 *                   properties:
 *                     name: { type: string }
 *                     description: { type: string }
 *                     category_id: { type: integer }
 *                     sku: { type: string }
 *                     base_price: { type: number }
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
 *         description: Validation error
 *       403:
 *         description: Requires vendor or admin access
 */
export async function POST(req: NextRequest) {
	return controller.bulkCreate(req);
}
