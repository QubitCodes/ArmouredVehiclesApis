import { NextRequest } from 'next/server';
import { CronController } from '@/controllers/CronController';

export async function GET(req: NextRequest) {
  const controller = new CronController();
  return controller.processWallets(req);
}
