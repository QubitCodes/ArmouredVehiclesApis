import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { User, Product, Review } from '../models';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Review Controller
 * Handles product review operations
 */
export class ReviewController extends BaseController {



	/**
	 * GET /api/v1/products/:id/reviews
	 * List reviews for a product
	 */
	async listByProduct(req: NextRequest, context: { params: { id: string } }) {
		try {
			const productId = context.params.id;
			if (!productId) {
				return this.sendError('Invalid product ID', 400);
			}

			const product = await Product.findByPk(productId);
			if (!product) {
				return this.sendError('Product not found', 404);
			}

			const { searchParams } = new URL(req.url);
			const page = parseInt(searchParams.get('page') || '1');
			const limit = parseInt(searchParams.get('limit') || '10');
			const sortBy = searchParams.get('sortBy') || 'created_at';
			const sortOrder = searchParams.get('sortOrder') || 'DESC';

			const offset = (page - 1) * limit;

			const { rows: reviews, count: total } = await Review.findAndCountAll({
				where: { product_id: productId },
				include: [
					{ model: User, as: 'reviewer', attributes: ['id', 'name', 'avatar'] },
				],
				order: [[sortBy, sortOrder]],
				limit,
				offset,
			});

			// Calculate average rating
			const allReviews = await Review.findAll({
				where: { product_id: productId },
				attributes: ['rating'],
			});
			const avgRating = allReviews.length > 0
				? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
				: 0;

			return this.sendSuccess({
				reviews,
				pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
				stats: { averageRating: Math.round(avgRating * 10) / 10, totalReviews: total },
			});
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}

	/**
	 * POST /api/v1/products/:id/reviews
	 * Create a new review
	 * Content-Type: application/json
	 */
	async create(req: NextRequest, context: { params: { id: string } }) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const productId = context.params.id;
			if (!productId) {
				return this.sendError('Invalid product ID', 400);
			}

			const product = await Product.findByPk(productId);
			if (!product) {
				return this.sendError('Product not found', 404);
			}

			// Check if user already reviewed this product
			const existingReview = await Review.findOne({
				where: { product_id: productId, user_id: user!.id },
			});

			if (existingReview) {
				return this.sendError('You have already reviewed this product', 400);
			}

			const body = await req.json();
			const { rating, title, content, images } = body;

			if (!rating || rating < 1 || rating > 5) {
				return this.sendError('Rating must be between 1 and 5', 400);
			}

			if (!content || content.trim().length < 10) {
				return this.sendError('Review content must be at least 10 characters', 400);
			}

			const review = await Review.create({
				product_id: productId,
				user_id: user!.id,
				rating,
				title: title || null,
				content: content.trim(),
				images: images || [],
				verified_purchase: false, // TODO: Check order history
			});

			// Update product average rating
			const allReviews = await Review.findAll({
				where: { product_id: productId },
				attributes: ['rating'],
			});
			const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
			await product.update({
				rating: Math.round(avgRating * 10) / 10,
				review_count: allReviews.length,
			});

			return this.sendSuccess({ review }, 'Review created', 201);
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}

	/**
	 * PUT /api/v1/products/reviews/:reviewId
	 * Update a review
	 * Content-Type: application/json
	 */
	async update(req: NextRequest, context: { params: { reviewId: string } }) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const reviewId = parseInt(context.params.reviewId);
			if (isNaN(reviewId)) {
				return this.sendError('Invalid review ID', 400);
			}

			const review = await Review.findByPk(reviewId);
			if (!review) {
				return this.sendError('Review not found', 404);
			}

			if (review.user_id !== user!.id) {
				return this.sendError('You can only edit your own reviews', 403);
			}

			const body = await req.json();
			const { rating, title, content, images } = body;

			await review.update({
				rating: rating !== undefined ? rating : review.rating,
				title: title !== undefined ? title : review.title,
				content: content !== undefined ? content.trim() : review.content,
				images: images !== undefined ? images : review.images,
			});

			// Update product average rating
			const product = await Product.findByPk(review.product_id);
			if (product) {
				const allReviews = await Review.findAll({
					where: { product_id: review.product_id },
					attributes: ['rating'],
				});
				const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
				await product.update({ rating: Math.round(avgRating * 10) / 10 });
			}

			return this.sendSuccess({ message: 'Review updated', review });
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}

	/**
	 * DELETE /api/v1/products/reviews/:reviewId
	 * Delete a review
	 */
	async delete(req: NextRequest, context: { params: { reviewId: string } }) {
		try {
			const { user, error } = await this.verifyAuth(req);
			if (error) return error;

			const reviewId = parseInt(context.params.reviewId);
			if (isNaN(reviewId)) {
				return this.sendError('Invalid review ID', 400);
			}

			const review = await Review.findByPk(reviewId);
			if (!review) {
				return this.sendError('Review not found', 404);
			}

			// Allow user to delete own review, or admin to delete any
			if (review.user_id !== user!.id && !['admin', 'super_admin'].includes(user!.user_type)) {
				return this.sendError('You can only delete your own reviews', 403);
			}

			const productId = review.product_id;
			await review.destroy();

			// Update product average rating
			const product = await Product.findByPk(productId);
			if (product) {
				const allReviews = await Review.findAll({
					where: { product_id: productId },
					attributes: ['rating'],
				});
				if (allReviews.length > 0) {
					const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
					await product.update({
						rating: Math.round(avgRating * 10) / 10,
						review_count: allReviews.length,
					});
				} else {
					await product.update({ rating: 0, review_count: 0 });
				}
			}

			return this.sendSuccess({ message: 'Review deleted' });
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}

	/**
	 * POST /api/v1/products/reviews/:reviewId/helpful
	 * Mark review as helpful (increment helpful count)
	 */
	async markHelpful(req: NextRequest, context: { params: { reviewId: string } }) {
		try {
			const reviewId = parseInt(context.params.reviewId);
			if (isNaN(reviewId)) {
				return this.sendError('Invalid review ID', 400);
			}

			const review = await Review.findByPk(reviewId);
			if (!review) {
				return this.sendError('Review not found', 404);
			}

			await review.update({ helpful_count: review.helpful_count + 1 });

			return this.sendSuccess({ message: 'Marked as helpful', helpfulCount: review.helpful_count });
		} catch (error: any) {
			return this.sendError(String((error as any).message), 500);
		}
	}
}
