import { NextRequest } from 'next/server';
import { InvoiceController } from '@/controllers/InvoiceController';

const controller = new InvoiceController();

/**
 * @swagger
 * /api/v1/invoices/order/{orderId}:
 *   get:
 *     summary: Get all invoices for an order
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order UUID
 *     responses:
 *       200:
 *         description: Invoices fetched successfully
 *       404:
 *         description: Order not found
 *       403:
 *         description: Forbidden - no access to this order
 */
export async function GET(req: NextRequest, context: { params: any }) {
    return controller.getInvoicesByOrder(req, context);
}
