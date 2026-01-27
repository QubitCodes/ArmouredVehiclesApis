
import { NextRequest } from 'next/server';
import { ProfileController } from '@/controllers/ProfileController';

/**
 * @swagger
 * /api/v1/profile/orders/{id}:
 *   get:
 *     tags:
 *       - Profile
 *     summary: Get specific order details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const controller = new ProfileController();
  return controller.getOrder(req, { params });
}
