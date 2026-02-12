import { NextRequest, NextResponse } from 'next/server';
import { AdminController } from '@/controllers/AdminController';

/**
 * @swagger
 * /api/v1/admin/customers/{id}/onboarding:
 *   patch:
 *     summary: Update customer onboarding status
 *     tags: [Admin, Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved_general, approved_controlled, rejected, pending_verification]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Onboarding status updated
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await props.params;
  return AdminController.updateCustomerOnboarding(request, { params: { id: resolvedParams.id } });
}
