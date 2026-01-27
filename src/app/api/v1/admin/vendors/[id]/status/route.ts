
import { NextRequest } from 'next/server';
import { AdminController } from '@/controllers/AdminController';

/**
 * @swagger
 * /api/v1/admin/vendors/{id}/status:
 *   put:
 *     tags: [Admin]
 *     summary: Update vendor status
 *     description: Activate or suspend a vendor account.
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
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [activate, suspend]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vendor status updated
 */
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return AdminController.updateVendorStatus(req, { params });
}
