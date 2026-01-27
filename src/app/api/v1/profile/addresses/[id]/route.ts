import { NextRequest } from 'next/server';
import { AddressController } from '@/controllers/AddressController';

const controller = new AddressController();

/**
 * @swagger
 * /api/v1/profile/addresses/{id}:
 *   get:
 *     tags: [Profile]
 *     summary: Get address by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Address details
 *       404:
 *         description: Address not found
 */
export async function GET(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const params = await context.params;
	return controller.getById(req, { params });
}

/**
 * @swagger
 * /api/v1/profile/addresses/{id}:
 *   put:
 *     tags: [Profile]
 *     summary: Update address
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label: { type: string }
 *               fullName: { type: string }
 *               phone: { type: string }
 *               addressLine1: { type: string }
 *               city: { type: string }
 *               postalCode: { type: string }
 *               country: { type: string }
 *               isDefault: { type: boolean }
 *     responses:
 *       200:
 *         description: Address updated
 *       404:
 *         description: Address not found
 */
export async function PUT(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const params = await context.params;
	return controller.update(req, { params });
}

/**
 * @swagger
 * /api/v1/profile/addresses/{id}:
 *   delete:
 *     tags: [Profile]
 *     summary: Delete address
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Address deleted
 *       404:
 *         description: Address not found
 */
export async function DELETE(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const params = await context.params;
	return controller.delete(req, { params });
}
