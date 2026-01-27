
import { NextRequest } from 'next/server';
import { FinanceController } from '@/controllers/FinanceController';

/**
 * @swagger
 * /api/v1/finance/logs:
 *   get:
 *     tags: [Finance]
 *     summary: Get Financial Logs
 *     description: Retrieve audit logs for sales, commissions, and withdrawals
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List of financial logs
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FinancialLog'
 *                     misc:
 *                       $ref: '#/components/schemas/Pagination'
 */
export async function GET(req: NextRequest) {
  return FinanceController.getLogs(req);
}
