import { NextRequest } from 'next/server';
import { PermissionController } from '../../../../../../controllers/PermissionController';

const permissionController = new PermissionController();

/**
 * @swagger
 * /api/v1/permissions/user/{id}:
 *   get:
 *     summary: Get permissions for a specific user
 *     tags: [Permissions]
 *   post:
 *     summary: Assign permissions to a user
 *     tags: [Permissions]
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return permissionController.getUserPermissions(req, { params });
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return permissionController.updateUserPermissions(req, { params });
}
