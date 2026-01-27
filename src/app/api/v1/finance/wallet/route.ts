
import { NextRequest } from 'next/server';
import { FinanceController } from '@/controllers/FinanceController';

/**
 * @swagger
 * /api/v1/finance/wallet:
 *   get:
 *     tags: [Finance]
 *     summary: Get wallet balance
 *     description: Returns the current wallet balance and summary for the authenticated vendor
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance and summary
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         balance: { type: number, description: Current wallet balance }
 *                         total_earned: { type: number, description: Total earnings }
 *                         total_withdrawn: { type: number, description: Total withdrawals }
 *                         pending_withdrawals: { type: number, description: Pending withdrawal amount }
 */
export async function GET(req: NextRequest) {
  return new FinanceController().getWallet(req);
}
