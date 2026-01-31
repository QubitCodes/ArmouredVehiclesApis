import { NextRequest } from 'next/server';
import { WebFrontendController } from '@/controllers/WebFrontendController';

const controller = new WebFrontendController();

export async function GET(req: NextRequest) {
  return controller.getAds(req);
}
