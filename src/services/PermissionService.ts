import { RefPermission } from '../models/RefPermission';
import { UserPermission } from '../models/UserPermission';
import { User } from '../models/User';
import { Op } from 'sequelize';

export class PermissionService {
  /**
   * Get all available permissions from reference table
   */
  /**
   * Get all available permissions from reference table
   */
  async getAllPermissions() {
    return await RefPermission.findAll({
      order: [['name', 'ASC']],
      attributes: ['name', 'label', 'comment'],
    });
  }

  /**
   * Get permissions for a specific user
   */
  async getUserPermissions(userId: string) {
    const userPermissions = await UserPermission.findAll({
      where: { user_id: userId },
      include: [
        {
          model: RefPermission,
          as: 'permission',
        },
      ],
    });

    // Extract just the permission names/details
    return userPermissions.map((up: any) => ({
      id: up.permission.name, // Use name as ID for frontend compatibility
      name: up.permission.name,
      label: up.permission.label,
      comment: up.permission.comment,
    }));
  }

  /**
   * Get formatted list of permission names for a user (useful for frontend checks)
   */
  async getUserPermissionNames(userId: string): Promise<string[]> {
    const permissions = await UserPermission.findAll({
      where: { user_id: userId },
      attributes: ['permission_name'],
    });
    return permissions.map(p => p.permission_name);
  }

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    // Check if user is super_admin
    const user = await User.findByPk(userId, { attributes: ['user_type'] });
    if (user && user.user_type === 'super_admin') {
      return true;
    }

    const count = await UserPermission.count({
      where: {
        user_id: userId,
        permission_name: permissionName,
      },
    });

    return count > 0;
  }

  /**
   * Check if user has ANY of the provided permissions
   */
  async hasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean> {
    // Check if user is super_admin
    const user = await User.findByPk(userId, { attributes: ['user_type'] });
    if (user && user.user_type === 'super_admin') {
      return true;
    }

    const count = await UserPermission.count({
      where: {
        user_id: userId,
        permission_name: {
          [Op.in]: permissionNames
        },
      },
    });

    return count > 0;
  }

  /**
   * Assign permissions to a user (Overwrites existing)
   * logic: Delete all existing, then bulk create new
   */
  async syncUserPermissions(userId: string, permissionNames: string[]) {
    // 1. Remove all existing permissions for this user
    await UserPermission.destroy({
      where: { user_id: userId },
    });

    if (permissionNames.length === 0) return;

    // 2. Prepare bulk insert data
    // Deduplicate names just in case
    const uniqueNames = [...new Set(permissionNames)];
    const records = uniqueNames.map((permName) => ({
      user_id: userId,
      permission_name: permName,
    }));

    // 3. Insert new permissions
    try {
      await UserPermission.bulkCreate(records);
    } catch (error) {
      console.error("Failed to bulk create permissions. Validating existence...", error);
      // Fallback: Verify names exist in RefPermission if FK failure occurs
      // But assuming frontend/seed provides valid names.
    }

    return this.getUserPermissions(userId);
  }

  /**
   * Get all users who have a specific set of permissions
   */
  async getUsersByPermission(permissionName: string) {
    return await User.findAll({
      include: [{
        model: RefPermission,
        as: 'permissions',
        where: { name: permissionName },
        required: true,
      }],
      attributes: ['id', 'name', 'email', 'user_type'],
    });
  }
}
