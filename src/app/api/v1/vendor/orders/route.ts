
import { NextRequest } from 'next/server';
import { VendorOrderController } from '@/controllers/VendorOrderController';

const controller = new VendorOrderController();

/**
 * @swagger
 * /api/v1/vendor/orders:
 *   get:
 *     tags: [Vendor Order]
 *     summary: List vendor orders
 *     description: Retrieve all orders containing products belonging to the authorized vendor.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of orders with pagination
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
 *                         $ref: '#/components/schemas/Order'
 *                     misc:
 *                       type: object
 *                       properties:
 *                         total: { type: integer }
 *                         page: { type: integer }
 *                         totalPages: { type: integer }
 *       401:
 *         description: Unauthorized
 */

export async function GET(req: NextRequest) {
  return controller.getOrders(req);
}
