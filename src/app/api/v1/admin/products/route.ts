
import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/ProductController';


const controller = new ProductController();

/**
 * @swagger
 * /api/v1/admin/products:
 *   get:
 *     tags: [Admin]
 *     summary: List Products (Admin View)
 *     description: View all products including pending/suspended, filterable by vendor.
 *     parameters:
 *       - in: query 
 *         name: search
 *         schema: { type: string }
 *         description: Search by name or sku
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, pending_review, approved, rejected, suspended]
 *         description: Filter by product status
 *       - in: query
 *         name: approval_status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by approval status
 *       - in: query
 *         name: vendor_id
 *         schema: { type: string }
 *       - in: query
 *         name: category_id
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of products
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
export async function GET(req: NextRequest) {
  return controller.adminList(req);
}
