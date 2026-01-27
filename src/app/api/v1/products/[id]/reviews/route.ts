import { NextRequest } from 'next/server';
import { ReviewController } from '@/controllers/ReviewController';

const controller = new ReviewController();

/**
 * @swagger
 * /api/v1/products/{id}/reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: Get product reviews
 *     description: Returns paginated reviews for a product with average rating
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [created_at, rating, helpful_count], default: created_at }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [ASC, DESC], default: DESC }
 *     responses:
 *       200:
 *         description: Reviews with pagination and stats
 *       404:
 *         description: Product not found
 */
export async function GET(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const params = await context.params;
	return controller.listByProduct(req, { params });
}

/**
 * @swagger
 * /api/v1/products/{id}/reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Create product review
 *     description: Add a new review for a product (one per user)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating, content]
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               title: { type: string }
 *               content: { type: string, minLength: 10 }
 *               images: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Review created
 *       400:
 *         description: Validation error or already reviewed
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Product not found
 */
export async function POST(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const params = await context.params;
	return controller.create(req, { params });
}
