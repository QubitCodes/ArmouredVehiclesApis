import { NextRequest } from 'next/server';
import { OnboardingController } from '@/controllers/OnboardingController';

const controller = new OnboardingController();

/**
 * @swagger
 * /api/v1/onboarding/step2:
 *   post:
 *     tags: [Onboarding]
 *     summary: Save Step 2 - Authorized Contact Details
 *     description: Saves authorized contact person information and terms acceptance
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contactFullName, termsAccepted]
 *             properties:
 *               contactFullName: { type: string }
 *               contactJobTitle: { type: string }
 *               contactWorkEmail: { type: string, format: email }
 *               contactIdDocumentUrl: { type: string }
 *               contactMobile: { type: string }
 *               contactMobileCountryCode: { type: string }
 *               termsAccepted: { type: boolean }
 *     responses:
 *       200:
 *         description: Step 2 saved successfully
 *       400:
 *         description: Terms must be accepted
 *       401:
 *         description: Authentication required
 */
export async function POST(req: NextRequest) {
	return controller.step2(req);
}
