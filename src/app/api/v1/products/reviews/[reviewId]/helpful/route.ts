import { NextRequest } from 'next/server';
import { ReviewController } from '@/controllers/ReviewController';

const controller = new ReviewController();

/**
 * @swagger
 * /api/v1/products/reviews/{reviewId}/helpful:
 *   post:
 *     tags: [Products]
 *     summary: Mark review as helpful
 *     description: Increment the helpful count for a review
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Marked as helpful
 *       404:
 *         description: Review not found
 */
export async function POST(
	req: NextRequest,
	context: { params: Promise<{ reviewId: string }> }
) {
	const params = await context.params;
	return controller.markHelpful(req, { params });
}
