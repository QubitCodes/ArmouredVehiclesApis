import { NextRequest } from 'next/server';
import { InvoiceController } from '@/controllers/InvoiceController';

const controller = new InvoiceController();

/**
 * @swagger
 * /api/v1/invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Invoice UUID
 *     responses:
 *       200:
 *         description: Invoice fetched successfully
 *       404:
 *         description: Invoice not found
 *       403:
 *         description: Forbidden - no access to this invoice
 */
export async function GET(req: NextRequest, context: { params: any }) {
    return controller.getInvoiceById(req, context);
}
