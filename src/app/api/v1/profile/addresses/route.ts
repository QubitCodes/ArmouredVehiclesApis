import { NextRequest } from 'next/server';
import { AddressController } from '@/controllers/AddressController';

const controller = new AddressController();

/**
 * @swagger
 * /api/v1/profile/addresses:
 *   get:
 *     tags: [Profile]
 *     summary: List user addresses
 *     description: Returns all addresses for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of addresses
 *       401:
 *         description: Authentication required
 */
export async function GET(req: NextRequest) {
	return controller.list(req);
}

/**
 * @swagger
 * /api/v1/profile/addresses:
 *   post:
 *     tags: [Profile]
 *     summary: Create new address
 *     description: Add a new shipping/billing address
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, phone, addressLine1, city, postalCode, country]
 *             properties:
 *               label: { type: string, example: "Home" }
 *               fullName: { type: string }
 *               phone: { type: string }
 *               phoneCountryCode: { type: string }
 *               addressLine1: { type: string }
 *               addressLine2: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               postalCode: { type: string }
 *               country: { type: string }
 *               isDefault: { type: boolean }
 *     responses:
 *       201:
 *         description: Address created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
export async function POST(req: NextRequest) {
	return controller.create(req);
}
