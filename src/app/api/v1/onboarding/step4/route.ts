import { NextRequest } from 'next/server';
import { OnboardingController } from '@/controllers/OnboardingController';

const controller = new OnboardingController();

/**
 * @swagger
 * /api/v1/onboarding/step4:
 *   post:
 *     tags: [Onboarding]
 *     summary: Save Step 4 - Account Preferences
 *     description: Saves selling categories and currency preferences
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sellingCategories: { type: array, items: { type: string }, description: Array of category names }
 *               registerAs: { type: string, default: "Verified Supplier" }
 *               preferredCurrency: { type: string, example: "AED" }
 *               sponsorContent: { type: boolean }

 *               isDraft: { type: boolean, description: If true, saves as draft without validation }
 *     responses:
 *       200:
 *         description: Step 4 saved successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
export async function POST(req: NextRequest) {
	return controller.step4(req);
}
