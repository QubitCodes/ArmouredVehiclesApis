import { NextRequest } from 'next/server';
import { AuthController } from '@/controllers/AuthController';

/**
 * @swagger
 * /auth/firebase/verify:
 *   post:
 *     summary: Verify Firebase ID Token and Exchange for App Tokens
 *     description: Verifies the ID token from Firebase Client SDK, checks/creates user, and returns app access/refresh tokens.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Firebase ID Token (JWT)
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     expiresIn:
 *                       type: number
 *       401:
 *         description: Invalid Token
 *       500:
 *         description: Server Error
 */
export async function POST(req: NextRequest) {
  const controller = new AuthController();
  return controller.verifyFirebaseAuth(req);
}
