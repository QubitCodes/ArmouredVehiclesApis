import { NextRequest } from 'next/server';
import { OtpController } from '@/controllers/OtpController';

/**
 * @swagger
 * /api/v1/auth/otp/set-phone:
 *   post:
 *     summary: Set phone number for user and send OTP
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
 *               countryCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
export async function POST(req: NextRequest) {
  const controller = new OtpController();
  return controller.registerPhoneStart(req);
}
