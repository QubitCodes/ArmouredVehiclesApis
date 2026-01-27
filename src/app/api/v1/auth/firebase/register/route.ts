import { NextRequest } from 'next/server';
import { AuthController } from '@/controllers/AuthController';

/**
 * @swagger
 * /auth/firebase/register:
 *   post:
 *     summary: Register a new user using Firebase Auth credentials
 *     description: Creates a new user in the database using the Firebase UID from the provided ID Token. Expects email/phone to be verified in Firebase.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *               - name
 *               - username
 *             properties:
 *               idToken:
 *                 type: string
 *               name:
 *                 type: string
 *               username:
 *                 type: string
 *               userType:
 *                 type: string
 *                 enum: [customer, vendor]
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: User already exists or invalid data
 *       500:
 *         description: Server Error
 */
export async function POST(req: NextRequest) {
  const controller = new AuthController();
  return controller.registerWithFirebase(req);
}
