
import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

const controller = new ProductController();

/**
 * @swagger
 * /api/v1/admin/products/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get Product Details (Admin View)
 *     description: Fetch distinct product details, bypassing public visibility checks.
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return controller.adminGetById(req, { params });
}
