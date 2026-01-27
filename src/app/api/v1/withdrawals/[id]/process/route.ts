
import { NextRequest } from 'next/server';
import { FinanceController } from '@/controllers/FinanceController';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  return FinanceController.processWithdrawal(req, { params: props.params });
}
