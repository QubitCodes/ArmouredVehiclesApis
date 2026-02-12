import { NextRequest } from 'next/server';
import { InvoiceController } from '@/controllers/InvoiceController';

const controller = new InvoiceController();

/**
 * @swagger
 * /api/v1/invoices/generate/{orderId}:
 *   post:
 *     summary: Generate customer invoice for an order (customer-facing)
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
 *         description: Order UUID (or order_group_id)
 *     responses:
 *       200:
 *         description: Invoice generated or already exists
 *       403:
 *         description: Forbidden - not the order owner
 *       404:
 *         description: Order not found
 */
export async function POST(req: NextRequest, context: { params: any }) {
    return controller.generateCustomerInvoice(req, context);
}
