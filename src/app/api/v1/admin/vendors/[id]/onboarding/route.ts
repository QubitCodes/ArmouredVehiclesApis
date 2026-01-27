
import { NextRequest } from 'next/server';
import { AdminController } from '@/controllers/AdminController';

/**
 * @swagger
 * /api/v1/admin/vendors/{id}/onboarding:
 *   put:
 *     tags: [Admin]
 *     summary: Update vendor onboarding status
 *     description: Approve (General/Controlled) or Reject a vendor's onboarding application.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved_general, approved_controlled, rejected]
 *                 description: |
 *                   The target onboarding status.
 *                   Available options:
 *                   * `approved_general` - Vendor approved for general items
 *                   * `approved_controlled` - Vendor approved for controlled items
 *                   * `rejected` - Vendor application rejected
 *               note:
 *                 type: string
 *                 description: Rejection reason or approval note
 *     responses:
 *       200:
 *         description: Vendor onboarding status updated
 */
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return AdminController.updateVendorOnboarding(req, { params });
}
