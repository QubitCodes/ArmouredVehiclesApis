import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { ReferenceModels } from '../models/Reference';
import { Op } from 'sequelize';
import { User, PlatformSetting } from '../models';
import { verifyAccessToken } from '../utils/jwt';
import { PermissionService } from '../services/PermissionService';
import { CurrencyService } from '../services/CurrencyService';

export class ReferenceController extends BaseController {

  /**
   * Get reference data by type
   * @param type The key of the reference model (e.g., 'countries', 'currencies')
   */
  async getReferenceData(req: NextRequest, { params }: { params: { type: string } }) {
    try {
      const { type } = await params;

      // Normalize: allow nature-of-business to map to nature_of_business
      const modelKey = type.replace(/-/g, '_');
      console.log(`[box] Reference Debug - Type: ${type}, Key: ${modelKey}`);
      console.log(`[box] Available Models: ${Object.keys(ReferenceModels).join(', ')}`);

      const Model = ReferenceModels[modelKey];

      if (!Model) {
        console.error(`[box] Model not found for key: ${modelKey}`);
        return this.sendError(`Invalid reference type: ${type}`, 400);
      }

      // Fetch data, sorted by display_order
      const data = await Model.findAll({
        where: { is_active: true },
        order: [['display_order', 'ASC'], ['name', 'ASC']],
      });

      return this.sendSuccess(data);
    } catch (error: any) {
      console.error('Reference Data Error:', error);
      return this.sendError('Failed to fetch reference data', 500, [error.message]);
    }
  }

  /**
   * Create a new reference item
   * POST /api/v1/references/:type
   */
  public async create(req: NextRequest, { params }: { params: { type: string } }) {
    try {
      const { user, error } = await this.verifyAdmin(req);
      if (error) return error;

      const { type } = await params;
      const modelKey = type.replace(/-/g, '_');
      const Model = ReferenceModels[modelKey];

      if (!Model) {
        return this.sendError(`Invalid reference type: ${type}`, 400);
      }

      const body = await req.json();

      if (!body.name) {
        return this.sendError('Name is required', 400);
      }

      // Check for duplicate name
      const existing = await Model.findOne({
        where: {
          name: { [Op.iLike]: body.name } // Case insensitive check
        }
      });

      if (existing) {
        return this.sendError(`${body.name} already exists in ${type}`, 400);
      }

      // Get max display order
      const maxOrder = await Model.max('display_order') || 0;

      // Extract standard fields and include others
      const { name, isActive, ...otherFields } = body;

      const newItem = await Model.create({
        name,
        is_active: isActive ?? true,
        display_order: (maxOrder as number) + 1,
        ...otherFields
      });

      return this.sendSuccess(newItem, 'Item created successfully', 201);
    } catch (error: any) {
      console.error('Reference Create Error:', error);
      return this.sendError('Failed to create item', 500, [error.message]);
    }
  }

  /**
   * Update a reference item
   * PUT /api/v1/references/:type/:id
   */
  async update(req: NextRequest, { params }: { params: { type: string; id: string } }) {
    try {
      const { user, error } = await this.verifyAdmin(req);
      if (error) return error;

      const { type, id } = await params;
      const modelKey = type.replace(/-/g, '_');
      const Model = ReferenceModels[modelKey];

      if (!Model) {
        return this.sendError(`Invalid reference type: ${type}`, 400);
      }

      const item = await Model.findByPk(id);
      if (!item) {
        return this.sendError('Item not found', 404);
      }

      const body = await req.json();

      // If name is changing, check for duplicates
      if (body.name && body.name.toLowerCase() !== item.name.toLowerCase()) {
        const existing = await Model.findOne({
          where: {
            name: { [Op.iLike]: body.name },
            id: { [Op.ne]: id }
          }
        });
        if (existing) {
          return this.sendError(`${body.name} already exists`, 400);
        }
      }

      const { name, isActive, displayOrder, ...otherFields } = body;

      await item.update({
        ...(name && { name }),
        ...(isActive !== undefined && { is_active: isActive }),
        ...(displayOrder !== undefined && { display_order: displayOrder }),
        ...otherFields
      });

      return this.sendSuccess(item, 'Item updated successfully');
    } catch (error: any) {
      console.error('Reference Update Error:', error);
      return this.sendError('Failed to update item', 500, [error.message]);
    }
  }

  /**
   * Delete (Soft Delete) or Hard Delete a reference item
   * DELETE /api/v1/references/:type/:id
   */
  async delete(req: NextRequest, { params }: { params: { type: string; id: string } }) {
    try {
      const { user, error } = await this.verifyAdmin(req);
      if (error) return error;

      const { type, id } = await params;
      const modelKey = type.replace(/-/g, '_');
      const Model = ReferenceModels[modelKey];

      if (!Model) {
        return this.sendError(`Invalid reference type: ${type}`, 400);
      }

      const item = await Model.findByPk(id);
      if (!item) {
        return this.sendError('Item not found', 404);
      }

      await item.destroy();

      return this.sendSuccess(null, 'Item deleted successfully');
    } catch (error: any) {
      console.error('Reference Delete Error:', error);
      // Handle foreign key constraint errors
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        return this.sendError('Cannot delete this item as it is currently in use.', 400);
      }
      return this.sendError('Failed to delete item', 500, [error.message]);
    }
  }

  /**
   * Get list of available reference types
   */
  async getReferenceTypes(req: NextRequest) {
    return this.sendSuccess(Object.keys(ReferenceModels));
  }

  /**
   * Get public platform settings
   * GET /api/v1/references/settings
   * 
   * Also triggers currency sync in background if 24+ hours since last sync
   */
  async getSettings(req: NextRequest) {
    try {
      // Trigger currency sync in background (non-blocking)
      // Only runs if 24+ hours since last sync and homepage sync is enabled
      CurrencyService.triggerHomepageSync();

      const vatSetting = await PlatformSetting.findOne({ where: { key: 'vat_percentage' } });

      // Get USD rate for frontend conversion (e.g. FedEx rates)
      // Stored as 1 AED = X USD (e.g. 0.2723)
      const usdRate = await CurrencyService.getRate('USD');

      return this.sendSuccess({
        vat_percentage: vatSetting ? parseFloat(vatSetting.value) : 5,
        currency_rates: {
          AED_TO_USD: usdRate || 0.2723, // Default fallback
          USD_TO_AED: usdRate ? (1 / usdRate) : 3.6725 // Calculated multiplier
        }
      });
    } catch (error: any) {
      console.error('Settings Fetch Error:', error);
      return this.sendError('Failed to fetch settings', 500, [error.message]);
    }
  }

  private async verifyAdmin(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, error: this.sendError('Unauthorized', 401) };
    }
    try {
      const token = authHeader.split(' ')[1];
      const decoded: any = verifyAccessToken(token);
      const user = await User.findByPk(decoded.userId || decoded.sub);
      if (!user) return { user: null, error: this.sendError('User not found', 401) };

      if (!['admin', 'super_admin'].includes(user.user_type)) {
        return { user: null, error: this.sendError('Forbidden', 403) };
      }

      if (user.user_type === 'admin') {
        const hasPerm = await new PermissionService().hasPermission(user.id, 'settings.manage');
        if (!hasPerm) {
          return { user: null, error: this.sendError('Forbidden: Missing settings.manage Permission', 403) };
        }
      }
      return { user, error: null };
    } catch (e) {
      return { user: null, error: this.sendError('Invalid Token', 401) };
    }
  }
}
