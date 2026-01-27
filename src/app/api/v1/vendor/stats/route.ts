
import { NextRequest } from 'next/server';
import { VendorController } from '@/controllers/VendorController';

/**
 * @swagger
 * /api/v1/vendor/stats:
 *   get:
 *     tags: [Vendor]
 *     summary: Get Dashboard Stats
 *     description: Retrieve vendor specific metrics (products, orders, sales).
 *     responses:
 *       200:
 *         description: Stats object
 */
export async function GET(req: NextRequest) {
  return VendorController.getStats(req);
}
