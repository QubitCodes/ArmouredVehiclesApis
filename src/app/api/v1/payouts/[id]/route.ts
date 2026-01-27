
import { NextRequest, NextResponse } from 'next/server';
import { PayoutController } from '@/controllers/PayoutController';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  return new PayoutController().getPayout(req, { params: props.params });
    // Note: Next.js 16/15 Params is a Promise often, controller expects { params: Promise<{ id }> }
}
