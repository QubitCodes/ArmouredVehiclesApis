import { NextRequest } from 'next/server';
import { OnboardingController } from '@/controllers/OnboardingController';

const controller = new OnboardingController();

/**
 * @swagger
 * /api/v1/onboarding/step0:
 *   post:
 *     tags: [Onboarding]
 *     summary: Save Step 0 - Company Basics
 *     description: Creates or updates the initial store profile with basic company information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [country, companyName, companyEmail, companyPhone]
 *             properties:
 *               country: { type: string, description: ISO country code }
 *               companyName: { type: string }
 *               companyEmail: { type: string, format: email }
 *               companyPhone: { type: string }
 *               companyPhoneCountryCode: { type: string, example: "+971" }
 *               typeOfBuyer: { type: string, nullable: true, description: Only for customers }
 *     responses:
 *       200:
 *         description: Store created/updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 profile: { $ref: '#/components/schemas/UserProfile' }
 *                 nextStep: { type: integer }
 *       401:
 *         description: Authentication required
 */
export async function POST(req: NextRequest) {
	return controller.step0(req);
}
