import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

const controller = new ProductController();

/**
 * @swagger
 * /api/v1/vendor/products/{id}/media/{mediaId}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete product media
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
 *       204:
 *         description: Media deleted
 *       401:
 *         description: Vendor authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Product or media not found
 */
export async function DELETE(
	req: NextRequest,
	context: { params: Promise<{ id: string; mediaId: string }> }
) {
	const params = await context.params;
	return controller.deleteMedia(req, { params });
}
