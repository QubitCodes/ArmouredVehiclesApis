
import { NextRequest } from 'next/server';
import { PayoutController } from '@/controllers/PayoutController';

export async function GET(req: NextRequest) {
  return new PayoutController().getPayouts(req);
}
