import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { RefProductBrand } from '../models/RefProductBrand';
import { Op } from 'sequelize';
import { z } from 'zod';

const brandSchema = z.object({
  name: z.string().min(1, "Name is required"),
  icon: z.string().optional(),
  slug: z.string().optional()
});

export class BrandController extends BaseController {
  
  /**
   * List all brands
   */
  async list(req: NextRequest) {
    try {
      const searchParams = req.nextUrl.searchParams;
      const search = searchParams.get('search');
      
      const whereClause: any = {};
      if (search) {
        whereClause.name = { [Op.iLike]: `%${search}%` };
      }

      const brands = await RefProductBrand.findAll({
        where: whereClause,
        order: [['name', 'ASC']]
      });

      return this.sendSuccess(brands);
    } catch (error: any) {
      return this.sendError(error.message, 500);
    }
  }

  /**
   * Create a brand
   */
  async create(req: NextRequest) {
    try {
      const body = await req.json();
      const validated = brandSchema.parse(body);

      const exists = await RefProductBrand.findOne({ where: { name: validated.name } });
      if (exists) {
        return this.sendError('Brand with this name already exists', 400);
      }

      const brand = await RefProductBrand.create(validated);
      return this.sendSuccess(brand, 'Brand created successfully', 201);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return this.sendError('Validation Failed', 400, (error as any).errors);
        }
        return this.sendError(error.message, 500);
    }
  }

  /**
   * Update a brand
   */
  async update(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const id = params.id;
      const body = await req.json();
      const validated = brandSchema.partial().parse(body);

      const brand = await RefProductBrand.findByPk(id);
      if (!brand) return this.sendError('Brand not found', 404);

      if (validated.name) {
          const exists = await RefProductBrand.findOne({ 
              where: { 
                  name: validated.name,
                  id: { [Op.ne]: id } 
              } 
          });
          if (exists) return this.sendError('Brand name already taken', 400);
      }

      await brand.update(validated);
      return this.sendSuccess(brand, 'Brand updated successfully');
    } catch (error: any) {
        return this.sendError(error.message, 500);
    }
  }

  /**
   * Delete a brand
   */
  async delete(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const id = params.id;
      const brand = await RefProductBrand.findByPk(id);
      if (!brand) return this.sendError('Brand not found', 404);

      await brand.destroy();
      return this.sendSuccess(null, 'Brand deleted successfully');
    } catch (error: any) {
        return this.sendError(error.message, 500);
    }
  }
}
