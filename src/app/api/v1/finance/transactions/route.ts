
import { NextRequest } from 'next/server';
import { FinanceController } from '@/controllers/FinanceController';

/**
 * @swagger
 * /api/v1/finance/transactions:
 *   get:
 *     tags: [Finance]
 *     summary: Get financial transaction history
 *     description: Returns paginated list of financial transactions for the authenticated vendor
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Items per page
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [credit, debit] }
 *         description: Filter by transaction type
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [sale, commission, withdrawal, refund, adjustment] }
 *         description: Filter by transaction category
 *     responses:
 *       200:
 *         description: List of financial transactions
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
  return new FinanceController().getTransactions(req);
}
