import { NextRequest } from 'next/server';
import { InvoiceController } from '@/controllers/InvoiceController';

const controller = new InvoiceController();

/**
 * @swagger
 * /api/v1/invoices/{id}/html:
 *   get:
 *     summary: Render invoice as A4 HTML for printing
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
 *         description: Invoice HTML rendered
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       404:
 *         description: Invoice not found or access denied
 */
export async function GET(req: NextRequest, context: { params: any }) {
    return controller.renderInvoiceHtml(req, context);
}
