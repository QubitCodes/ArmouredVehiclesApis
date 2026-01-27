
import { NextRequest } from 'next/server';
import { OtpController } from '@/controllers/OtpController';

/**
 * @swagger
 * /api/v1/auth/otp/phone/register/verify:
 *   post:
 *     summary: Verify Phone OTP for Registration
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, code]
 *             properties:
 *               phone:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Phone Verified
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
 *                         expiresIn: { type: integer }
 *                         phoneVerified: { type: boolean }
 *                         nextStep: { type: string }
 */
export async function POST(req: NextRequest) {
    const controller = new OtpController();
    return controller.registerPhoneVerify(req);
}
