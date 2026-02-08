import { NextRequest } from 'next/server';
import { CronController } from '@/controllers/CronController';

const controller = new CronController();

/**
 * GET /api/v1/cron/sync-currencies
 * Sync currency exchange rates from external API
 * 
 * Headers:
 *   x-cron-secret: Required in production
 * 
 * Response:
 *   { success: boolean, currenciesUpdated: number }
 */
export async function GET(req: NextRequest) {
    return controller.syncCurrencies(req);
}
