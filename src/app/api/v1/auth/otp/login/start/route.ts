import { OtpController } from '@/controllers/OtpController';
import { NextRequest } from 'next/server';

const otpController = new OtpController();

/**
 * @swagger
 * /api/v1/auth/otp/login/start:
 *   post:
 *     summary: Start OTP login (Send Code)
 *     tags: [Auth - OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier]
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email address or Phone number
 *     responses:
 *       200:
 *         description: OTP sent
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
 *                         userId: { type: string }
 *       404:
 *         description: User not found
 */
export async function POST(req: NextRequest) {
  return otpController.loginStart(req);
}
