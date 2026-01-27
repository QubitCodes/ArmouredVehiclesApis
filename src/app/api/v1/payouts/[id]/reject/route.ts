
import { NextRequest } from 'next/server';
import { PayoutController } from '@/controllers/PayoutController';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  return new PayoutController().rejectPayout(req, { params: props.params });
}
