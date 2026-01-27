
import { NextRequest } from 'next/server';
import { OtpController } from '@/controllers/OtpController';

/**
 * @swagger
 * /api/v1/auth/otp/phone/register/start:
 *   post:
 *     summary: Start Phone Verification for Registration (Send OTP)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, userId]
 *             properties:
 *               phone:
 *                 type: string
 *               userId:
 *                 type: string
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
 */
export async function POST(req: NextRequest) {
    const controller = new OtpController();
    return controller.registerPhoneStart(req);
}
