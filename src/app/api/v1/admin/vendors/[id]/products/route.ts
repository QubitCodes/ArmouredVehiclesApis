
import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

/**
 * @swagger
 * /api/v1/admin/vendors/{id}/products:
 *   get:
 *     tags: [Admin]
 *     summary: List products for a specific vendor
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search term
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of vendor products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Product' } }
 *                 misc:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     pages: { type: integer }
 *                     filters: { type: object }
 *                     placeholder_image: { type: string }
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const controller = new ProductController();
  const { id } = await params;
  
  // Inject vendor_id into searchParams to reuse adminList logic safely
  req.nextUrl.searchParams.set('vendor_id', id);
  
  return controller.adminList(req);
}
