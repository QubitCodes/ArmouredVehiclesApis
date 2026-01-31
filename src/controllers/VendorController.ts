
import { NextRequest, NextResponse } from 'next/server';
import { User, Order, OrderItem, Product, FinancialLog } from '../models';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';

import { verifyAccessToken } from '../utils/jwt';

export class VendorController {
  
  static async getStats(req: NextRequest) {
    try {
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
      }

      let userId: number;
      try {
          const token = authHeader.split(' ')[1];
          const decoded: any = verifyAccessToken(token);
          userId = decoded.userId || decoded.sub;
      } catch (e) {
          return NextResponse.json({ success: false, message: 'Invalid Token' }, { status: 401 });
      }

      const user = await User.findByPk(userId);
      if (!user) {
          return NextResponse.json({ success: false, message: 'User not found' }, { status: 401 });
      }

      if (user.user_type !== 'vendor') {
           return NextResponse.json({ success: false, message: 'Forbidden: Vendors only' }, { status: 403 });
      }

      const [productsCount, ordersCount, salesData] = await Promise.all([
        Product.count({ where: { vendor_id: userId } }),
        // Orders containing my products (Approximation: Orders where items have my product)
        Order.count({ 
           include: [{
             model: OrderItem,
             as: 'items',
             required: true,
             include: [{ model: Product, as: 'product', where: { vendor_id: userId } }]
           }] 
        }),
        // Earnings: Sum of Credits in FinancialLog
        FinancialLog.sum('amount', { where: { user_id: userId, type: 'credit', category: 'sale' } })
      ]);

      return NextResponse.json({
        success: true,
        data: {
          products: productsCount,
          orders: ordersCount,
          total_sales: salesData || 0
        }
      });
    } catch (error) {
       console.error('Get Stats Error:', error);
       return NextResponse.json({ success: false, message: 'Failed to fetch stats' }, { status: 500 });
    }
  }
}
