
import { NextRequest } from 'next/server';
import { AdminController } from '@/controllers/AdminController';

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Get Dashboard Stats
 *     description: Returns stats for Admin or Vendor dashboard based on user role
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         total_products: { type: integer }
 *                         total_orders: { type: integer }
 *                         total_revenue: { type: number }
 *                         total_customers: { type: integer }
 *                         total_vendors: { type: integer }
 *                         pending_orders: { type: integer }
 *                         recent_orders:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Order'
 */
export async function GET(req: NextRequest) {
  const controller = new AdminController();
  return controller.getDashboardStats(req);
}
