
import { NextRequest } from 'next/server';
import { VendorOrderController } from '@/controllers/VendorOrderController';

/**
 * @swagger
 * /api/v1/vendor/orders:
 *   get:
 *     tags: [Vendor]
 *     summary: List Vendor Orders
 *     description: Get orders containing vendor's products.
 *     responses:
 *       200:
 *         description: List of orders
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
 */
export async function GET(req: NextRequest) {
  return VendorOrderController.getOrders(req);
}
