import { NextRequest, NextResponse } from 'next/server';
import { AuthController } from '@/controllers/AuthController';

/**
 * @swagger
 * /auth/user-exists:
 *   post:
 *     summary: Check if a user exists with the given email or phone
 *     description: Used during login/signup flows to determine if the user is new or existing. Optionally filter by user type.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email address or Phone number
 *               email:
 *                 type: string
 *                 description: Legacy alias for identifier
 *               userType:
 *                 type: string
 *                 enum: [customer, vendor, admin]
 *                 description: Optional filter to only match users of a specific type. 'admin' will match both admin and super_admin.
 *     responses:
 *       200:
 *         description: User exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     identifier_type:
 *                       type: string
 *                       enum: [email, phone]
 *                     identifier:
 *                       type: string
 *                     userType:
 *                       type: string
 *       404:
 *         description: User does not exist (or no user of that type exists)
 *       400:
 *         description: Invalid input
 */
export async function POST(req: NextRequest) {
  const controller = new AuthController();
  return controller.userExists(req);
}
