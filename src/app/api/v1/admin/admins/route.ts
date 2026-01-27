
import { NextRequest } from 'next/server';
import { AdminController } from '@/controllers/AdminController';

/**
 * @swagger
 * /api/v1/admin/admins:
 *   get:
 *     summary: List all admins
 *     description: Retrieve a list of administrators. Regular admins see only other admins; Super Admins see all admins and super admins.
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name or email
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *         description: Items per page
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of admins
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/User' } }
 *                 misc:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     pages: { type: integer }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export async function GET(req: NextRequest) {
  return AdminController.getAdmins(req);
}

/**
 * @swagger
 * /api/v1/admin/admins:
 *   post:
 *     summary: Create a new admin
 *     description: Create a new admin user. Only accessible by admins/super admins.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - country_code
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               country_code:
 *                 type: string
 *     responses:
 *       201:
 *         description: Admin created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: User already exists
 */
export async function POST(req: NextRequest) {
    return AdminController.createAdmin(req);
}
