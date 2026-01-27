import { NextRequest, NextResponse } from 'next/server';
import { PermissionService } from '../services/PermissionService';
import { responseHandler } from '../utils/responseHandler';
import { z } from 'zod';

const permissionService = new PermissionService();

/**
 * Controller for handling Permission-related requests
 */
export class PermissionController {
  
  /**
   * Get all available reference permissions
   */
  async getPermissions(req: NextRequest) {
    try {
      const permissions = await permissionService.getAllPermissions();
      return responseHandler.success(permissions, 'Permissions fetched successfully');
    } catch (error: any) {
      return responseHandler.error('Failed to fetch permissions', 500, [error.message]);
    }
  }

  async getUserPermissions(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const userId = params.id;
      const permissions = await permissionService.getUserPermissions(userId);
      return responseHandler.success(permissions, 'User permissions fetched successfully');
    } catch (error: any) {
      return responseHandler.error('Failed to fetch user permissions', 500, [error.message]);
    }
  }

  async updateUserPermissions(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const userId = params.id;
      const body = await req.json();

      const schema = z.object({
        permissions: z.array(z.string()),
      });
      const validation = schema.safeParse(body);

      if (!validation.success) {
        return responseHandler.error('Validation Error', 400, [validation.error.flatten()]);
      }

      await permissionService.syncUserPermissions(userId, validation.data.permissions);
      
      return responseHandler.success(null, 'User permissions updated successfully');
    } catch (error: any) {
      return responseHandler.error('Failed to update user permissions', 500, [error.message]);
    }
  }

  async getUsersByPermission(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const permissionName = searchParams.get('permission');

      if (!permissionName) {
        return responseHandler.error('Permission name is required', 400);
      }

      const users = await permissionService.getUsersByPermission(permissionName);
      return responseHandler.success(users, 'Users fetched successfully');
    } catch (error: any) {
      return responseHandler.error('Error fetching users', 500, [error.message]);
    }
  }
}
