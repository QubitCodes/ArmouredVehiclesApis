
import { NextRequest } from 'next/server';
import { AdminController } from '@/controllers/AdminController';

/**
 * @swagger
 * /api/v1/admin/customers:
 *   get:
 *     tags: [Admin]
 *     summary: List all customers
 *     description: |
 *       Retrieve a paginated list of customers.
 *       - **Admins**: See all customers with full details
 *       - **Vendors**: Only see customers who bought their products (limited fields: id, name, email, phone, country_code)
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name, email or phone
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, suspended]
 *         description: Filter by account status
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of customers
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     misc:
 *                       type: object
 *                       properties:
 *                         total: { type: integer }
 *                         page: { type: integer }
 *                         pages: { type: integer }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not admin or vendor
 */
export async function GET(req: NextRequest) {
  return AdminController.getCustomers(req);
}
