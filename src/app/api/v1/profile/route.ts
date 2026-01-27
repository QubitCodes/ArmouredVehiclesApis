import { NextRequest } from 'next/server';
import { ProfileController } from '@/controllers/ProfileController';

const controller = new ProfileController();

/**
 * @swagger
 * /api/v1/profile:
 *   get:
 *     tags: [Profile]
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile and onboarding data
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       allOf:
 *                         - $ref: '#/components/schemas/User'
 *                         - $ref: '#/components/schemas/Profile'
 *       401:
 *         description: Authentication required
 */
export async function GET(req: NextRequest) {
	return controller.getProfile(req);
}

/**
 * @swagger
 * /api/v1/profile:
 *   put:
 *     tags: [Profile]
 *     summary: Update user profile
 *     description: Update name, email, phone, avatar
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               countryCode: { type: string }
 *               avatar: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *             application/json:
 *               schema:
 *                 allOf:
 *                   - $ref: '#/components/schemas/ApiResponse'
 *                   - type: object
 *                     properties:
 *                       data:
 *                         $ref: '#/components/schemas/User'
 *       401:
 *         description: Authentication required
 */
export async function PUT(req: NextRequest) {
	return controller.updateProfile(req);
}
