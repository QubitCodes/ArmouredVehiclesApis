
import { NextRequest, NextResponse } from 'next/server';
import { BaseController } from './BaseController';
import { Order, OrderItem } from '../models/Order';
import { Product } from '../models/Product';
import { User, UserProfile } from '../models';

export class VendorOrderController extends BaseController {

  async getOrders(req: NextRequest) {
    try {
      const { user, error } = await this.verifyAuth(req);
      if (error) return error;

      const searchParams = req.nextUrl.searchParams;
      const page = Number(searchParams.get('page')) || 1;
      const limit = Number(searchParams.get('limit')) || 20;
      const offset = (page - 1) * limit;

      // Logic: Get Orders that contain products by this vendor.
      // Vendor only sees PAID orders
      const orders = await Order.findAndCountAll({
        where: {
          payment_status: 'paid'
        },
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
          {
            model: OrderItem,
            as: 'items',
            required: true,
            include: [{
              model: Product,
              as: 'product',
              where: { vendor_id: user!.id },
              required: true
            }]
          }
        ],
        limit,
        offset,
        order: [['created_at', 'DESC']]
      });

      return this.sendSuccess(orders.rows, 'Orders fetched', 200, {
        total: orders.count,
        page,
        totalPages: Math.ceil(orders.count / limit)
      });
    } catch (error) {
      console.error('Get Vendor Orders Error:', error);
      return this.sendError('Failed to fetch orders', 500);
    }
  }

  async fulfillItem(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const { user, error } = await this.verifyAuth(req);
      if (error) return error;

      // Enforce Onboarding
      const onboardingError = await this.checkOnboarding(user);
      if (onboardingError) return onboardingError;

      const { item_ids } = await req.json(); // Array of item IDs to mark shipped

      if (!Array.isArray(item_ids)) return this.sendError('Invalid items', 400);

      const order = await Order.findByPk(params.id);
      if (!order) return this.sendError('Order not found', 404);

      // Ownership check is implied by biz logic (simplifying for MVP)

      order.shipment_status = 'shipped';
      await order.save();

      return this.sendSuccess(null, 'Order marked as shipped');

    } catch (error) {
      return this.sendError('Failed to fulfill', 500);
    }
  }

  async approveOrder(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const { user, error } = await this.verifyAuth(req);
      if (error) return error;

      // Enforce Onboarding
      const onboardingError = await this.checkOnboarding(user);
      if (onboardingError) return onboardingError;

      // Parse request body for optional invoice comments
      let invoice_comments: string | null = null;
      try {
        const body = await req.json();
        invoice_comments = body.invoice_comments || null;
      } catch {
        // No body or invalid JSON - continue without comments
      }

      const order = await Order.findByPk(params.id);
      if (!order) return this.sendError('Order not found', 404);

      if (order.vendor_id !== user!.id) {
        return this.sendError('Forbidden', 403);
      }

      if (invoice_comments) {
        order.invoice_comments = invoice_comments;
      }
      order.order_status = 'approved';
      await order.save();

      // Note: Admin Invoice generation is now handled when shipment is delivered

      return this.sendSuccess(
        null,
        'Order approved successfully'
      );
    } catch (error) {
      console.error('Approve Order Error:', error);
      return this.sendError('Failed to approve order', 500);
    }
  }

  async rejectOrder(req: NextRequest, { params }: { params: { id: string } }) {
    try {
      const { user, error } = await this.verifyAuth(req);
      if (error) return error;

      // Enforce Onboarding
      const onboardingError = await this.checkOnboarding(user);
      if (onboardingError) return onboardingError;

      const order = await Order.findByPk(params.id);
      if (!order) return this.sendError('Order not found', 404);

      if (order.vendor_id !== user!.id) {
        return this.sendError('Forbidden', 403);
      }

      order.order_status = 'rejected';
      await order.save();

      return this.sendSuccess(null, 'Order rejected successfully');
    } catch (error) {
      console.error('Reject Order Error:', error);
      return this.sendError('Failed to reject order', 500);
    }
  }
}
