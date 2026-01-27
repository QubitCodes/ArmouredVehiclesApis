import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { Product, Category, ProductStatus } from '../models';
import { sequelize } from '../models';
import { fn, col, literal } from 'sequelize';

/**
 * Filters Controller
 * Returns dynamic filter options for product listing sidebar
 */
export class FiltersController extends BaseController {

	/**
	 * GET /api/v1/products/filters
	 * Get available filter options based on current products
	 */
	async getProductFilters(req: NextRequest) {
		try {
			// Get all approved products for aggregation
			const whereClause = { status: ProductStatus.APPROVED };

			// Get price range
			const priceStats: any = await Product.findOne({
				where: whereClause,
				attributes: [
					[fn('MIN', col('base_price')), 'minPrice'],
					[fn('MAX', col('base_price')), 'maxPrice'],
				],
				raw: true,
			});

			// Get categories with product counts
			const categories = await Category.findAll({
				attributes: [
					'id',
					'name',
					'parent_id',
					[literal(`(SELECT COUNT(*) FROM products WHERE products.category_id = "Category".id AND products.status = 'approved')`), 'productCount'],
				],
				order: [['name', 'ASC']],
			});

			// Get distinct conditions
			const conditions = await Product.findAll({
				where: whereClause,
				attributes: [[fn('DISTINCT', col('condition')), 'condition']],
				raw: true,
			});

			// Get distinct materials (array field - need to unnest)
			const materialsResult: any = await sequelize.query(`
				SELECT DISTINCT unnest(materials) as material 
				FROM products 
				WHERE status = 'approved' AND materials IS NOT NULL
				ORDER BY material
				LIMIT 50
			`, { type: 'SELECT' });

			// Get distinct countries of origin
			const origins = await Product.findAll({
				where: {
					...whereClause,
					country_of_origin: { [require('sequelize').Op.ne]: null },
				},
				attributes: [[fn('DISTINCT', col('country_of_origin')), 'country']],
				raw: true,
			});

			// Get vendor count
			const vendorCount = await Product.count({
				where: whereClause,
				distinct: true,
				col: 'vendor_id',
			});

			return this.sendSuccess({
				priceRange: {
					min: priceStats?.minPrice || 0,
					max: priceStats?.maxPrice || 10000,
				},
				categories: categories.map((c: any) => ({
					id: c.id,
					name: c.name,
					parentId: c.parent_id,
					productCount: parseInt(c.getDataValue('productCount')) || 0,
				})),
				conditions: conditions
					.map((c: any) => c.condition)
					.filter((c: string | null) => c !== null),
				materials: materialsResult.map((m: any) => m.material),
				origins: origins
					.map((o: any) => o.country)
					.filter((o: string | null) => o !== null),
				vendorCount,
			});
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}
}
