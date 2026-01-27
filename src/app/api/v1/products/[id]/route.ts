import { NextRequest } from 'next/server';
import { ProductController } from '@/controllers/ProductController';

const controller = new ProductController();

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     summary: Get product details
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details with media and category
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Product'
 *                     misc:
 *                       type: object
 *                       properties:
 *                         placeholder_image:
 *                           type: string
 *                           description: Fallback image URL
 *       404:
 *         description: Product not found
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return controller.getById(req, { params });
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await req.formData();
      const data: any = {};
      const files: File[] = [];

      formData.forEach((value, key) => {
        if (value instanceof File) {
          files.push(value);
        } else {
          if (data[key]) {
             if (!Array.isArray(data[key])) {
                 data[key] = [data[key]];
             }
             data[key].push(value);
          } else {
             data[key] = value;
          }
        }
      });

      return controller.update(req, { params, parsedData: { data, files } });

    } catch (e) {
       return Response.json({
         status: false,
         message: 'Error parsing form data',
         code: 400,
         error: String(e)
      }, { status: 400 });
    }
  }

  return controller.update(req, { params });
}
