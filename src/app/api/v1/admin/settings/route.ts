
import { NextRequest } from 'next/server';
import { AdminController } from '@/controllers/AdminController';

/**
 * @swagger
 * /api/v1/admin/settings:
 *   get:
 *     tags: [Admin]
 *     summary: Get platform settings
 *     description: Retrieve global platform configuration (commission, auto-approval).
 *     responses:
 *       200:
 *         description: Platform settings object
 *   put:
 *     tags: [Admin]
 *     summary: Update platform settings
 *     description: Update global platform configuration.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               commission_percent: { type: string }
 *               auto_approve_products: { type: string }
 *     responses:
 *       200:
 *         description: Settings updated
 */
export async function GET(req: NextRequest) {
  return AdminController.getSettings(req);
}

export async function PUT(req: NextRequest) {
  return AdminController.updateSettings(req);
}
