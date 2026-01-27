import { NextRequest } from 'next/server';
import { OnboardingController } from '@/controllers/OnboardingController';

const controller = new OnboardingController();

/**
 * @swagger
 * /api/v1/onboarding/step1:
 *   post:
 *     tags: [Onboarding]
 *     summary: Save Step 1 - Company Registration Details
 *     description: Saves company registration and legal entity information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               countryOfRegistration: { type: string }
 *               registeredCompanyName: { type: string }
 *               tradeBrandName: { type: string }
 *               yearOfEstablishment: { type: integer }
 *               legalEntityId: { type: string }
 *               legalEntityIssueDate: { type: string, format: date }
 *               legalEntityExpiryDate: { type: string, format: date }
 *               cityOfficeAddress: { type: string }
 *               officialWebsite: { type: string }
 *               entityType: { type: string, enum: [manufacturer, distributor, wholesaler, retailer, importer, exporter, other] }
 *               dunsNumber: { type: string }
 *               vatCertificateUrl: { type: string }
 *               taxVatNumber: { type: string }
 *               taxIssuingDate: { type: string, format: date }
 *               taxExpiryDate: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Step 1 saved successfully
 *       400:
 *         description: Please complete step 0 first
 *       401:
 *         description: Authentication required
 */
export async function POST(req: NextRequest) {
	return controller.step1(req);
}
