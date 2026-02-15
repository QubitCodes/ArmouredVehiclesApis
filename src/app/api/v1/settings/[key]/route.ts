
import { ReferenceController } from '@/controllers/ReferenceController';
import { NextRequest } from 'next/server';

const controller = new ReferenceController();

/**
 * @swagger
 * /api/v1/settings/{key}:
 *   get:
 *     summary: Get a platform setting by key
 *     tags: [Settings]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: The setting key (e.g., vat_rules)
 *     responses:
 *       200:
 *         description: Platform setting object
 *       404:
 *         description: Setting not found
 */
export async function GET(req: NextRequest, context: { params: Promise<{ key: string }> }) {
    return controller.getSettingByKey(req, context);
}

/**
 * @swagger
 * /api/v1/settings/{key}:
 *   put:
 *     summary: Update a platform setting by key (Admin only)
 *     tags: [Settings]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value:
 *                 description: The new value (can be string, number, or JSON)
 *     responses:
 *       200:
 *         description: Setting updated
 *       404:
 *         description: Setting not found
 */
export async function PUT(req: NextRequest, context: { params: Promise<{ key: string }> }) {
    return controller.updateSettingByKey(req, context);
}
