import { NextRequest } from 'next/server';
import { InvoiceController } from '@/controllers/InvoiceController';

const controller = new InvoiceController();

/**
 * @swagger
 * /api/v1/invoices/view/{token}/html:
 *   get:
 *     summary: Render invoice as A4 HTML via public token (no auth required)
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
 *         description: Invoice HTML rendered
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       404:
 *         description: Invoice not found or link expired
 */
export async function GET(req: NextRequest, context: { params: any }) {
    return controller.renderInvoiceHtmlByToken(req, context);
}
