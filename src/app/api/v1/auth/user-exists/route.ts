import { NextRequest, NextResponse } from 'next/server';
import { AuthController } from '@/controllers/AuthController';

/**
 * @swagger
 * /auth/user-exists:
 *   post:
 *     summary: Check if a user exists with the given email or phone
 *     description: Used during login/signup flows to determine if the user is new or existing.
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
 *         description: User does not exist
 *       400:
 *         description: Invalid input
 */
export async function POST(req: NextRequest) {
  const controller = new AuthController();
  return controller.userExists(req);
}
