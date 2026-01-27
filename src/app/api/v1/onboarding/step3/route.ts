import { NextRequest } from 'next/server';
import { OnboardingController } from '@/controllers/OnboardingController';

const controller = new OnboardingController();

/**
 * @swagger
 * /api/v1/onboarding/step3:
 *   post:
 *     tags: [Onboarding]
 *     summary: Save Step 3 - Business & Compliance
 *     description: Saves business nature, compliance information, and required licenses
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [natureOfBusiness, endUseMarkets, businessLicenseUrl, complianceTermsAccepted]
 *             properties:
 *               natureOfBusiness: { type: array, items: { type: string } }
 *               controlledDualUseItems: { type: string }
 *               licenseTypes: { type: array, items: { type: string } }
 *               endUseMarkets: { type: array, items: { type: string } }
 *               operatingCountries: { type: array, items: { type: string } }
 *               isOnSanctionsList: { type: boolean }
 *               businessLicenseUrl: { type: string }
 *               defenseApprovalUrl: { type: string }
 *               companyProfileUrl: { type: string }
 *               complianceTermsAccepted: { type: boolean }
 *     responses:
 *       200:
 *         description: Step 3 saved successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
export async function POST(req: NextRequest) {
	return controller.step3(req);
}
