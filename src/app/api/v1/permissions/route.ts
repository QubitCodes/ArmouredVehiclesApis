import { NextRequest } from 'next/server';
import { PermissionController } from '../../../../controllers/PermissionController';

const permissionController = new PermissionController();

/**
 * @swagger
 * /api/v1/permissions:
 *   get:
 *     summary: Get all available permissions
 *     tags: [Permissions]
 *     responses:
 *       200:
 *         description: List of permissions
 */
export async function GET(req: NextRequest) {
  return permissionController.getPermissions(req);
}
