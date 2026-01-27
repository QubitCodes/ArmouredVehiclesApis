import { NextRequest } from 'next/server';
import { OnboardingController } from '@/controllers/OnboardingController';

const controller = new OnboardingController();

/**
 * @swagger
 * /api/v1/onboarding/submit-verification:
 *   post:
 *     tags: [Onboarding]
 *     summary: Submit for Identity Verification
 *     description: Submits the application for identity verification and sets status to pending_verification
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [verificationMethod]
 *             properties:
 *               verificationMethod:
 *                 type: string
 *                 description: Selected verification method
 *                 example: "Over a Live Video Call"
 *     responses:
 *       200:
 *         description: Application submitted for verification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 profile: { $ref: '#/components/schemas/UserProfile' }
 *                 nextStep: { type: string, example: "dashboard" }
 *       400:
 *         description: Verification method not selected
 *       401:
 *         description: Authentication required
 */
export async function POST(req: NextRequest) {
	return controller.submitVerification(req);
}
