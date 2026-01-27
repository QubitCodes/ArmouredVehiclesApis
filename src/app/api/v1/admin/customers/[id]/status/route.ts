
import { NextRequest } from 'next/server';
import { AdminController } from '@/controllers/AdminController';

/**
 * @swagger
 * /api/v1/admin/customers/{id}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Update customer status
 *     description: Activate or suspend a customer account. **Admin only** - vendors cannot access this endpoint.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Customer user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [activate, suspend]
 *                 description: Action to perform
 *               reason:
 *                 type: string
 *                 description: Reason for suspension (required when action is suspend)
 *     responses:
 *       200:
 *         description: Status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *       400:
 *         description: Invalid action
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Customer not found
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return AdminController.updateCustomerStatus(req, { params });
}
