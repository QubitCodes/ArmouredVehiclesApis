import { NextRequest } from 'next/server';
import { OtpController } from '@/controllers/OtpController';

/**
 * @swagger
 * /api/v1/auth/otp/verify-phone:
 *   post:
 *     summary: Verify phone number OTP
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
 *               - code
 *             properties:
 *               phone:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Phone verified successfully
 *       400:
 *         description: Invalid code
 *       401:
 *         description: Unauthorized
 */
export async function POST(req: NextRequest) {
  const controller = new OtpController();
  return controller.registerPhoneVerify(req);
}
