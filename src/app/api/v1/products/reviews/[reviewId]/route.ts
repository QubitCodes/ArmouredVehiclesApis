import { NextRequest } from 'next/server';
import { ReviewController } from '@/controllers/ReviewController';

const controller = new ReviewController();

/**
 * @swagger
 * /api/v1/products/reviews/{reviewId}:
 *   put:
 *     tags: [Reviews]
 *     summary: Update review
 *     description: Update your own review
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               title: { type: string }
 *               content: { type: string }
 *               images: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Review updated
 *       403:
 *         description: Can only edit own reviews
 *       404:
 *         description: Review not found
 */
export async function PUT(
	req: NextRequest,
	context: { params: Promise<{ reviewId: string }> }
) {
	const params = await context.params;
	return controller.update(req, { params });
}

/**
 * @swagger
 * /api/v1/products/reviews/{reviewId}:
 *   delete:
 *     tags: [Reviews]
 *     summary: Delete review
 *     description: Delete your own review (or any as admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Review deleted
 *       403:
 *         description: Can only delete own reviews
 *       404:
 *         description: Review not found
 */
export async function DELETE(
	req: NextRequest,
	context: { params: Promise<{ reviewId: string }> }
) {
	const params = await context.params;
	return controller.delete(req, { params });
}
