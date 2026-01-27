
import { NextRequest } from 'next/server';
import { AuthController } from '@/controllers/AuthController';

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user and revoke session
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
export async function POST(req: NextRequest) {
  const controller = new AuthController();
  return controller.logout(req);
}
