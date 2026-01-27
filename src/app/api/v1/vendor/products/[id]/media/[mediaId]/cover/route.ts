import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

const controller = new ProductController();

/**
 * @swagger
 * /api/v1/vendor/products/{id}/media/{mediaId}/cover:
 *   post:
 *     tags: [Products]
 *     summary: Set cover image
 *     description: |
 *       Sets a media item as the product cover image.
 *       Vendors can do this only for their own products; admins/super_admins
 *       can do this for any vendor-created product.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Cover image set
 *       401:
 *         description: Vendor authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Product or media not found
 */
export async function POST(
	req: NextRequest,
	context: { params: Promise<{ id: string; mediaId: string }> }
) {
	const params = await context.params;
	return controller.setCoverImage(req, { params });
}
