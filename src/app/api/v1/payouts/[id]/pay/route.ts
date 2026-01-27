import { NextRequest } from 'next/server';
import { PayoutController } from '@/controllers/PayoutController';

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return new PayoutController().markAsPaid(req, context);
}
