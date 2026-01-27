
import { NextRequest } from 'next/server';
import { ProfileController } from '@/controllers/ProfileController';

/**
 * @swagger
 * /api/v1/profile/orders:
 *   get:
 *     tags:
 *       - Profile
 *     summary: Get current user's orders
 *     security:
 *       - BearerAuth: []
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
  const controller = new ProfileController();
  return controller.getOrders(req);
}
