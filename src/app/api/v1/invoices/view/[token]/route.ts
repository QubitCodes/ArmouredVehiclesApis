import { NextRequest } from 'next/server';
import { InvoiceController } from '@/controllers/InvoiceController';

const controller = new InvoiceController();

/**
 * @swagger
 * /api/v1/invoices/view/{token}:
 *   get:
 *     summary: Get invoice by public access token (no auth required)
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique public access token
 *     responses:
 *       200:
 *         description: Invoice fetched successfully
 *       404:
 *         description: Invoice not found or link expired
 */
export async function GET(req: NextRequest, context: { params: any }) {
    return controller.getInvoiceByToken(req, context);
}
