
import { NextRequest } from 'next/server';
import { ProfileController } from '../../../../../../../controllers/ProfileController';

const controller = new ProfileController();

/**
 * @swagger
 * /api/v1/profile/orders/group/{id}:
 *   get:
 *     tags:
 *       - Profile
 *     summary: Get order group details (sub-orders)
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
 *         description: Order group details containing sub-orders
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
 *                         group_id: { type: string }
 *                         total_amount: { type: number }
 *                         orders: 
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Order'
 */

export async function GET(req: NextRequest, context: any) {
  return controller.getOrderGroup(req, context);
}
