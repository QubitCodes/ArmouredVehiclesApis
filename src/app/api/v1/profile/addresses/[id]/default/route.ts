import { NextRequest } from 'next/server';
import { AddressController } from '@/controllers/AddressController';

const controller = new AddressController();

/**
 * @swagger
 * /api/v1/profile/addresses/{id}/default:
 *   post:
 *     tags: [Profile]
 *     summary: Set address as default
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Default address set
 *       404:
 *         description: Address not found
 */
export async function POST(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const params = await context.params;
	return controller.setDefault(req, { params });
}
