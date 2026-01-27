import { NextRequest } from 'next/server';
import { PermissionController } from '../../../../../controllers/PermissionController';

const permissionController = new PermissionController();

/**
 * @swagger
 * /api/v1/permissions/users:
 *   get:
 *     summary: Get users who have a specific permission
 *     tags: [Permissions]
 *     parameters:
 *       - in: query
 *         name: permission
 *         required: true
 *         schema:
 *           type: string
 */
export async function GET(req: NextRequest) {
  return permissionController.getUsersByPermission(req);
}
