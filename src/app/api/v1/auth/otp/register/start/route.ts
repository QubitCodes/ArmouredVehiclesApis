import { OtpController } from '@/controllers/OtpController';
import { NextRequest } from 'next/server';

const otpController = new OtpController();

/**
 * @swagger
 * /api/v1/auth/otp/register/start:
 *   post:
 *     summary: Start OTP Registration
 *     tags: [Auth - OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, name, username]
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               username:
 *                 type: string
 *               userType:
 *                 type: string
 *                 enum: [customer, vendor]
 *     responses:
 *       200:
 *         description: Verification code sent
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
 */
export async function POST(req: NextRequest) {
  return otpController.registerStart(req);
}
