
import { NextRequest } from 'next/server';
import { AdminController } from '@/controllers/AdminController';

/**
 * @swagger
 * /api/v1/admin/admins/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update an admin user
 *     description: Update details of an existing admin. Only admins/super_admins can perform this.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               country_code:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Admin updated successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Admin not found
 *   delete:
 *     tags: [Admin]
 *     summary: Delete an admin user
 *     description: Soft delete an admin. Super Admins cannot be deleted by regular Admins.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Admin not found
 */
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return AdminController.updateAdmin(req, { params });
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return AdminController.deleteAdmin(req, { params });
}
