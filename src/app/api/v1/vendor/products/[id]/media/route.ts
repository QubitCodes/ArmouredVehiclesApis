import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

const controller = new ProductController();

/**
 * @swagger
 * /api/v1/vendor/products/{id}/media:
 *   post:
 *     tags: [Products]
 *     summary: Add product media
 *     description: |
 *       Adds an image or file to the product.
 *       Vendors can modify media only for their own products; admins/super_admins
 *       can modify media for any vendor-created product.
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
 *             required: [type, url]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [product_image, cad_file, certificate, msds, manual, video]
 *               url: { type: string }
 *               fileName: { type: string }
 *               fileSize: { type: integer }
 *               mimeType: { type: string }
 *               isCover: { type: boolean }
 *               displayOrder: { type: integer }
 *     responses:
 *       201:
 *         description: Media added
 *       401:
 *         description: Vendor authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Product not found
 */
export async function POST(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const params = await context.params;
	return controller.addMedia(req, { params });
}
