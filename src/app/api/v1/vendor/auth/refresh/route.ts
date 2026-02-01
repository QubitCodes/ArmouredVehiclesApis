import { NextRequest } from 'next/server';
import { AuthController } from '../../../../../../controllers/AuthController';

/**
 * @swagger
 * /api/v1/vendor/auth/refresh:
 *   post:
 *     summary: Refresh Vendor Access Token
 *     description: Exchange a valid refresh token for a new access token
 *     tags:
 *       - Vendor Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
 *       201:
 *         description: Missing Refresh Token
 *       210:
 *         description: Invalid Refresh Token / Reuse Detected
 *       211:
 *         description: Session Expired
 */
export async function POST(req: NextRequest) {
  return new AuthController().refresh(req);
}
