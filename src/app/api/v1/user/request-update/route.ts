import { NextRequest } from 'next/server';
import { ProfileController } from '../../../../../controllers/ProfileController';

/**
 * @swagger
 * /api/v1/user/request-update:
 *   post:
 *     summary: Request Profile Update
 *     description: Resets user onboarding status to 'update_needed' and step to 0, requiring re-approval.
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile update requested successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
export async function POST(req: NextRequest) {
    return new ProfileController().requestUpdate(req);
}
