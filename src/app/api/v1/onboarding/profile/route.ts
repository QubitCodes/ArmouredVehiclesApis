import { NextRequest } from 'next/server';
import { OnboardingController } from '@/controllers/OnboardingController';

const controller = new OnboardingController();

/**
 * @swagger
 * /api/v1/onboarding/profile:
 *   get:
 *     tags: [Onboarding]
 *     summary: Get onboarding profile
 *     description: Retrieves the current user's onboarding profile and user information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile and user information
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
 *                         profile: { $ref: '#/components/schemas/Profile' }
 *       401:
 *         description: Authentication required
 */
export async function GET(req: NextRequest) {
	return controller.getProfile(req);
}
