import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { FinanceService } from '../services/FinanceService';
import { WithdrawalRequest } from '../models';

/**
 * Finance Controller
 * Handles Wallet and Transaction operations
 */
export class FinanceController extends BaseController {

    /**
     * GET /api/v1/finance/wallet
     * Get current user's wallet balance
     */
    async getWallet(req: NextRequest) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            const wallet = await FinanceService.getWalletBalance(user!.id);

            return this.sendSuccess(wallet);
        } catch (error: any) {
            return this.sendError(error.message, 500);
        }
    }

    /**
     * GET /api/v1/finance/transactions
     * Get transaction history
     */
    async getTransactions(req: NextRequest) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            const { searchParams } = new URL(req.url);
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '20');
            const offset = (page - 1) * limit;

            const excludeTypes = user!.user_type === 'vendor' ? ['commission'] : [];
            const { count, rows } = await FinanceService.getTransactionHistory(user!.id, limit, offset, excludeTypes);

            return this.sendSuccess(rows, 'Transactions retrieved', 200, {
                total: count,
                page,
                limit,
                pages: Math.ceil(count / limit)
            });
        } catch (error: any) {
            return this.sendError(error.message, 500);
        }
    }
    /**
     * GET /api/v1/finance/logs
     * Get financial audit logs
     */
    static async getLogs(req: NextRequest) {
        try {
            const controller = new FinanceController();
            const { user, error } = await controller.verifyAuth(req);
            if (error) return error;

            const { searchParams } = new URL(req.url);
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '20');
            const offset = (page - 1) * limit;

            const { count, rows } = await FinanceService.getFinancialLogs(user!.id, limit, offset);

            return controller.sendSuccess(rows, 'Logs retrieved', 200, {
                total: count,
                page,
                limit,
                pages: Math.ceil(count / limit)
            });
        } catch (error: any) {
            return new FinanceController().sendError(error.message, 500);
        }
    }
    /**
     * POST /api/v1/withdrawals/:id/process
     * Process a withdrawal request (Admin only)
     */
    static async processWithdrawal(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
            const controller = new FinanceController();
            const { user, error } = await controller.verifyAuth(req);
            if (error) return error;

            if (user!.user_type !== 'admin' && user!.user_type !== 'super_admin') {
                return controller.sendError('Forbidden', 403);
            }

            const { id } = await params;
            const body = await req.json();
            const { adminNote, transactionReference } = body;

            // Import WithdrawalRequest dynamically or assume it's available via module augmentation if not imported suitable
            // Importing distinct model to avoid circular deps if any, but standard import preferred.
            // I need to add WithdrawalRequest to imports first.
            const withdrawal = await WithdrawalRequest.findByPk(id);

            if (!withdrawal) return controller.sendError('Withdrawal request not found', 404);
            if (withdrawal.status !== 'pending') return controller.sendError('Request is not pending', 400);

            // Check Balance
            const wallet = await FinanceService.getWalletBalance(withdrawal.user_id);
            if (Number(wallet.balance) < Number(withdrawal.amount)) {
                return controller.sendError('Insider funds', 400);
            }

            // Debit Wallet
            await FinanceService.debitWallet(
                withdrawal.user_id,
                withdrawal.amount,
                'payout', // Using payout type for withdrawal
                `Withdrawal Processed (Ref: ${transactionReference || 'N/A'})`,
                { withdrawalRequestId: withdrawal.id, adminId: user!.id },
                null
            );

            // Update Request
            await withdrawal.update({
                status: 'processed',
                admin_note: adminNote,
                processed_at: new Date()
            });

            return controller.sendSuccess(withdrawal, 'Withdrawal processed successfully');

        } catch (error: any) {
            return new FinanceController().sendError(error.message, 500);
        }
    }


    /**
     * GET /api/v1/withdrawals
     * List user's withdrawal requests
     */
    static async getWithdrawals(req: NextRequest) {
        try {
            const controller = new FinanceController();
            const { user, error } = await controller.verifyAuth(req);
            if (error) return error;

            const { searchParams } = new URL(req.url);
            const status = searchParams.get('status');
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '20');
            const offset = (page - 1) * limit;

            const whereClause: any = {};
            if (user!.user_type !== 'admin' && user!.user_type !== 'super_admin') {
                whereClause.user_id = user!.id;
            }
            if (status) {
                whereClause.status = status;
            }

            const { count, rows } = await WithdrawalRequest.findAndCountAll({
                where: whereClause,
                limit,
                offset,
                order: [['requested_at', 'DESC']]
            });

            return controller.sendSuccess(rows, 'Withdrawals retrieved', 200, {
                total: count,
                page,
                limit,
                pages: Math.ceil(count / limit)
            });

        } catch (error: any) {
            return new FinanceController().sendError(error.message, 500);
        }
    }

    /**
     * POST /api/v1/withdrawals
     * Create a withdrawal request
     */
    static async requestWithdrawal(req: NextRequest) {
        try {
            const controller = new FinanceController();
            const { user, error } = await controller.verifyAuth(req);
            if (error) return error;

            const body = await req.json();
            const { amount } = body;

            if (!amount || amount <= 0) {
                return controller.sendError('Invalid amount', 400);
            }

            // Check Balance
            const wallet = await FinanceService.getWalletBalance(user!.id);
            if (Number(wallet.balance) < Number(amount)) {
                return controller.sendError('Insufficient available balance', 400);
            }

            const withdrawal = await WithdrawalRequest.create({
                user_id: user!.id,
                amount,
                status: 'pending'
            });

            return controller.sendSuccess(withdrawal, 'Withdrawal request submitted');

        } catch (error: any) {
            return new FinanceController().sendError(error.message, 500);
        }
    }
}
