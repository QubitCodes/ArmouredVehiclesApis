import { ReferenceController } from '@/controllers/ReferenceController';
import { NextRequest } from 'next/server';

const referenceController = new ReferenceController();

/**
 * @swagger
 * /api/v1/references/nature-of-business:
 *   get:
 *     summary: Get nature of business options
 *     tags: [Reference Data]
 *     responses:
 *       200:
 *         description: List of nature of business options
 *
 * /api/v1/references/end-use-markets:
 *   get:
 *     summary: Get end-use market options
 *     tags: [Reference Data]
 *     responses:
 *       200:
 *         description: List of end-use market options
 *
 * /api/v1/references/license-types:
 *   get:
 *     summary: Get license type options
 *     tags: [Reference Data]
 *     responses:
 *       200:
 *         description: List of license type options
 *
 * /api/v1/references/countries:
 *   get:
 *     summary: Get countries list
 *     tags: [Reference Data]
 *     responses:
 *       200:
 *         description: List of countries with codes
 *
 * /api/v1/references/vendor-categories:
 *   get:
 *     summary: Get vendor categories for Step 4
 *     tags: [Reference Data]
 *     responses:
 *       200:
 *         description: List of vendor categories
 *
 * /api/v1/references/currencies:
 *   get:
 *     summary: Get currencies list
 *     tags: [Reference Data]
 *     responses:
 *       200:
 *         description: List of currencies
 *
 * /api/v1/references/payment-methods:
 *   get:
 *     summary: Get payment methods
 *     tags: [Reference Data]
 *     responses:
 *       200:
 *         description: List of payment methods
 *
 * /api/v1/references/financial-institutions:
 *   get:
 *     summary: Get financial institutions (banks)
 *     tags: [Reference Data]
 *     responses:
 *       200:
 *         description: List of financial institutions
 *
 * /api/v1/references/proof-types:
 *   get:
 *     summary: Get proof types for bank verification
 *     tags: [Reference Data]
 *     responses:
 *       200:
 *         description: List of proof types
 *
 * /api/v1/references/verification-methods:
 *   get:
 *     summary: Get identity verification methods
 *     tags: [Reference Data]
 *     responses:
 *       200:
 *         description: List of verification methods
 *
 * /api/v1/references/controlled-item-types:
 *   get:
 *     summary: Get controlled item types
 *     tags: [Reference Data]
 *     responses:
 *       200:
 *         description: List of controlled item types
 * 
 * /api/v1/references/pricing-terms:
 *   get:
 *     summary: Get pricing terms
 *     tags: [Reference Data]
 *     responses:
 *       200:
 *         description: List of pricing terms
 * 
 * /api/v1/references/manufacturing-sources:
 *   get:
 *     summary: Get manufacturing sources
 *     tags: [Reference Data]
 *     responses:
 *       200:
 *         description: List of manufacturing sources
 * 
 * /api/v1/references/type-of-buyer:
 *   get:
 *     summary: Get type of buyer
 *     tags: [Reference Data]
 *     responses:
 *       200:
 *         description: List of buyer types
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
    const resolvedParams = await params;
    return referenceController.getReferenceData(req, { params: resolvedParams });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
    const resolvedParams = await params;
    return referenceController.create(req, { params: resolvedParams });
}
