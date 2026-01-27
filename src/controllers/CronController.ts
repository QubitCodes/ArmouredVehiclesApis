import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { FinanceService } from '../services/FinanceService';

/**
 * Cron Controller
 * Handles System Automation Tasks
 */
export class CronController extends BaseController {

    /**
     * GET /api/v1/cron/process-wallets
     * Trigger Fund Unlocking
     * Security: Should be protected by a Secret Key headers
     */
    async processWallets(req: NextRequest) {
        try {
            // Verify CRON_SECRET if in production
            const authHeader = req.headers.get('x-cron-secret');
            if (process.env.NODE_ENV === 'production' && authHeader !== process.env.CRON_SECRET) {
                return this.sendError('Unauthorized', 401);
            }

            const result = await FinanceService.processUnlockFunds();

            return this.sendSuccess({
                message: 'Wallet processing complete',
                data: result
            });

        } catch (error: any) {
            return this.sendError(error.message, 500);
        }
    }
}
