
import { NextRequest } from 'next/server';
import { FinanceController } from '@/controllers/FinanceController';

/**
 * @swagger
 * /api/v1/withdrawals:
 *   get:
 *     tags: [Finance]
 *     summary: List Withdrawal Requests
 *     responses:
 *       200:
 *         description: List of requests
 *   post:
 *     tags: [Finance]
 *     summary: Request Withdrawal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number }
 *     responses:
 *       200:
 *         description: Request submitted
 */
export async function GET(req: NextRequest) {
  return FinanceController.getWithdrawals(req);
}

export async function POST(req: NextRequest) {
  return FinanceController.requestWithdrawal(req);
}
