
import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

const controller = new ProductController();

/**
 * @swagger
 * /api/v1/vendor/products:
 *   get:
 *     tags: [Vendor]
 *     summary: List Vendor's Products
 *     description: Get products belonging to the authenticated vendor.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of vendor products
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *   post:
 *     tags: [Vendor]
 *     summary: Create Vendor Product
 *     description: Create a new product for the vendor.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, basePrice]
 *             properties:
 *               name: { type: string }
 *               basePrice: { type: number }
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Product'
 */

export async function GET(req: NextRequest) {
  // Logic inside ProductController.list handles filtering by vendor_id query param
  return controller.list(req);
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await req.formData();
      const data: any = {};
      let coverImage: File | null = null;
      const files: File[] = [];

      formData.forEach((value, key) => {
        if (key === 'coverImage' && value instanceof File) {
          coverImage = value;
        } else if (key === 'files' && value instanceof File) {
          files.push(value);
        } else if (value instanceof File) {
          files.push(value);
        } else {
          if (data[key]) {
            if (!Array.isArray(data[key])) data[key] = [data[key]];
            data[key].push(value);
          } else {
            data[key] = value;
          }
        }
      });

      return controller.create(req, { data, files, coverImage });
    } catch (e) {
      return Response.json({
        status: false,
        message: 'Error parsing form data',
        code: 400,
        error: String(e)
      }, { status: 400 });
    }
  }

  return controller.create(req);
}
