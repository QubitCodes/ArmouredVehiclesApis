import { NextRequest } from 'next/server';
import { AdminController } from '@/controllers/AdminController';

/**
 * @swagger
 * /api/v1/admin/customers/{id}/profile:
 *   patch:
 *     summary: Update customer profile fields (e.g., specialized discount)
 *     tags: [Admin - Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               discount:
 *                 type: number
 *                 description: Specialized discount percentage (0-3)
 *     responses:
 *       200:
 *         description: Profile updated
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    return await AdminController.updateCustomerProfile(req, { params });
}
