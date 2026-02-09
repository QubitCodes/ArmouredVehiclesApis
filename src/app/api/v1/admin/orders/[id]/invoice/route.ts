
import { NextRequest } from 'next/server';
import { AdminOrderController } from '../../../../../../../controllers/AdminOrderController';

export async function POST(req: NextRequest, { params }: { params: any }) {
    return AdminOrderController.generateInvoice(req, { params });
}
