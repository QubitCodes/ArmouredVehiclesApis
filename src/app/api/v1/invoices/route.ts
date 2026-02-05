
import { NextRequest } from 'next/server';
import { InvoiceController } from '@/controllers/InvoiceController';

const invoiceController = new InvoiceController();

export async function GET(req: NextRequest) {
    return invoiceController.getInvoices(req);
}
