import { OtpController } from '@/controllers/OtpController';
import { NextRequest } from 'next/server';

const otpController = new OtpController();

/**
 * @swagger
 * /api/v1/auth/otp/login/verify:
 *   post:
 *     summary: Verify OTP and Login
 *     tags: [Auth - OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, code]
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email address or Phone number
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
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
 *       400:
 *         description: Invalid code
 */
export async function POST(req: NextRequest) {
  return otpController.loginVerify(req);
}
