
import { NextRequest } from 'next/server';
import { AdminController } from '@/controllers/AdminController';

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Get Dashboard Stats (SDUI)
 *     description: Returns dashboard widgets for Admin or Vendor. Response format is Server-Driven UI (SDUI). Widgets are dynamically populated based on user permissions.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard widgets array
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
 *                         items:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/DashboardWidget'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server Error
 */
export async function GET(req: NextRequest) {
  return AdminController.getDashboardStats(req);
}
