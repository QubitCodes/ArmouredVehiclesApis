import { OtpController } from '@/controllers/OtpController';
import { NextRequest } from 'next/server';

const otpController = new OtpController();

/**
 * @swagger
 * /api/v1/auth/otp/register/verify:
 *   post:
 *     summary: Verify Email OTP and Complete Registration
 *     tags: [Auth - OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code]
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified and User logged in
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
 *                         user: { $ref: '#/components/schemas/User' }
 *                         accessToken: { type: string }
 *                         refreshToken: { type: string }
 */
export async function POST(req: NextRequest) {
  return otpController.registerVerify(req);
}
