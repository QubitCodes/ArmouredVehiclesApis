import { NextRequest } from 'next/server';
import { OnboardingController } from '@/controllers/OnboardingController';

const controller = new OnboardingController();

/**
 * @swagger
 * /api/v1/onboarding/step5:
 *   post:
 *     tags: [Onboarding]
 *     summary: Save Step 5 - Bank Details
 *     description: Saves payment method preferences and bank account information for vendor payouts
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentMethod: { type: string, description: Selected payment method name }
 *               bankCountry: { type: string, description: ISO country code }
 *               financialInstitution: { type: string, description: Bank name }
 *               swiftCode: { type: string, description: Auto-filled from bank selection }
 *               bankAccountNumber: { type: string }
 *               proofType: { type: string, enum: ["Bank Statement", "Cancelled Cheque", "Bank Letter", "Account Confirmation Letter"] }
 *               bankProofUrl: { type: string }
 *               isDraft: { type: boolean, description: If true, saves as draft without validation }
 *     responses:
 *       200:
 *         description: Step 5 saved successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
export async function POST(req: NextRequest) {
	return controller.step5(req);
}
