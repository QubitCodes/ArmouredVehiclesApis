
import { NextRequest, NextResponse } from 'next/server';
import { ReferenceController } from '@/controllers/ReferenceController';

const controller = new ReferenceController();

/**
 * @swagger
 * /api/v1/references/{type}/reorder:
 *   put:
 *     summary: Reorder reference items
 *     tags: [References]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         schema:
 *           type: string
 *         required: true
 *         description: Reference type key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     display_order:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Items reordered successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ type: string }> } // Type definition for Next.js 15+ params
) {
    // Await params before using them
    const resolvedParams = await params;
    return controller.reorder(request, { params: resolvedParams });
}
