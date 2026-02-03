
import { ReferenceController } from '@/controllers/ReferenceController';
import { NextRequest } from 'next/server';

const referenceController = new ReferenceController();

/**
 * @swagger
 * /api/v1/settings:
 *   get:
 *     summary: Get public platform settings
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Platform settings object
 */
export async function GET(req: NextRequest) {
    return referenceController.getSettings(req);
}
