import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

const controller = new ProductController();

/**
 * @swagger
 * /api/v1/admin/products/{id}/media/{mediaId}:
 *   delete:
 *     summary: Delete specific product media
 *     tags:
 *       - Admin Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: mediaId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Media deleted successfully
 *       404:
 *         description: Media or Product not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string; mediaId: string }> }
) {
  const params = await props.params;
  return controller.deleteMedia(req, { params });
}
