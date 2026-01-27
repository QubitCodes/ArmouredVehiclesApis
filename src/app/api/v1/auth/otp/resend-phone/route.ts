import { NextRequest } from 'next/server';
import { OtpController } from '@/controllers/OtpController';

/**
 * @swagger
 * /api/v1/auth/otp/resend-phone:
 *   post:
 *     summary: Resend phone verification OTP
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
export async function POST(req: NextRequest) {
  const controller = new OtpController();
  return controller.registerPhoneStart(req);
}
