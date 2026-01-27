import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

const controller = new ProductController();

/**
 * @swagger
 * /api/v1/admin/products/{id}/media:
 *   post:
 *     summary: Add media to a product
 *     tags:
 *       - Admin Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - url
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [product_image, cad_file, certificate, msds, manual, video]
 *               url:
 *                 type: string
 *               fileName:
 *                 type: string
 *               fileSize:
 *                 type: number
 *               mimeType:
 *                 type: string
 *               isCover:
 *                 type: boolean
 *               displayOrder:
 *                 type: number
 *     responses:
 *       201:
 *         description: Media added successfully
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Product not found
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  return controller.addMedia(req, { params });
}

/**
 * @swagger
 * /api/v1/admin/products/{id}/media:
 *   delete:
 *     summary: Bulk delete product media
 *     tags:
 *       - Admin Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mediaIds
 *             properties:
 *               mediaIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Media deleted successfully
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Product not found
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  return controller.bulkDeleteMedia(req, { params });
}
