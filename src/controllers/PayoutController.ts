import { NextRequest } from 'next/server';
import { BaseController } from './BaseController';
import { FinanceService } from '../services/FinanceService';
import { PayoutRequest, User } from '../models'; // Ensure User is imported for include
import { Op } from 'sequelize';

/**
 * Payout Controller
 * Handles Payout Requests and Admin Approvals
 */
export class PayoutController extends BaseController {

    /**
     * POST /api/v1/payouts/request
     * Vendor requests a payout
     */
    async requestPayout(req: NextRequest) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            const body = await req.json();
            const { amount, otp } = body; // TODO: Verify OTP if enforced

            if (!amount || amount <= 0) {
                return this.sendError('Invalid amount', 400);
            }

            // Check Balance
            const wallet = await FinanceService.getWalletBalance(user!.id);
            if (Number(wallet.balance) < Number(amount)) {
                return this.sendError('Insufficient available balance', 400);
            }

            // Create Request
            const payout = await PayoutRequest.create({
                user_id: user!.id,
                amount: amount,
                status: 'pending',
                otp_verified_at: new Date() // Assuming OTP verified for now or add logic
            });

            return this.sendSuccess({
                message: 'Payout request submitted successfully',
                payout
            });
        } catch (error: any) {
            return this.sendError(error.message, 500);
        }
    }

    /**
     * GET /api/v1/payouts
     * List payouts (Admin sees all, Vendor sees own)
     */
    async getPayouts(req: NextRequest) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            const { searchParams } = new URL(req.url); // Fix: use req.url
            const status = searchParams.get('status');
            const limit = parseInt(searchParams.get('limit') || '20');
            const page = parseInt(searchParams.get('page') || '1');
            const offset = (page - 1) * limit;

            const whereClause: any = {};
            if (user!.user_type !== 'admin' && user!.user_type !== 'super_admin') {
                whereClause.user_id = user!.id;
            }
            if (status) {
                whereClause.status = status;
            }

            const { count, rows } = await PayoutRequest.findAndCountAll({
                where: whereClause,
                limit,
                offset,
                order: [['created_at', 'DESC']],
                include: [
                    { model: User, as: 'user', attributes: ['name', 'email', 'id'] },
                    { model: User, as: 'approver', attributes: ['name', 'email'] }
                ]
            });

            return this.sendSuccess(rows, 'Payouts retrieved', 200, {
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
     * GET /api/v1/payouts/:id
     * Get details
     */
    async getPayout(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            const { id } = await params;

            const payout = await PayoutRequest.findByPk(id, {
                include: [{ model: User, as: 'user', attributes: ['name', 'email', 'phone', 'id'] }]
            });

            if (!payout) return this.sendError('Payout request not found', 404);

            // Access Control
            if (user!.user_type !== 'admin' && user!.user_type !== 'super_admin' && payout.user_id !== user!.id) {
                return this.sendError('Forbidden', 403);
            }

            return this.sendSuccess(payout);

        } catch (error: any) {
            return this.sendError(error.message, 500);
        }
    }

    /**
     * POST /api/v1/payouts/:id/approve
     * Admin approves payout (just marks as approved, no wallet debit yet)
     * Body (FormData or JSON): adminNote (string)
     */
    async approvePayout(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            if (user!.user_type !== 'admin' && user!.user_type !== 'super_admin') {
                return this.sendError('Forbidden', 403);
            }

            const { id } = await params;
            
            // Parse FormData
            const formData = await req.formData();
            const adminNote = formData.get('adminNote') as string | null;

            const payout = await PayoutRequest.findByPk(id);
            if (!payout) return this.sendError('Payout request not found', 404);
            if (payout.status !== 'pending') return this.sendError('Request is not pending', 400);

            // Just update status to approved (no wallet debit yet)
            await payout.update({
                status: 'approved',
                admin_note: adminNote,
                approved_by: user!.id,
                approved_at: new Date()
            });

            return this.sendSuccess({ message: 'Payout approved', payout });

        } catch (error: any) {
            return this.sendError(error.message, 500);
        }
    }

    /**
     * POST /api/v1/payouts/:id/pay
     * Admin marks payout as paid (debits wallet + requires transaction proof)
     * Body (FormData): receipt (file), transactionReference (string), adminNote (string)
     */
    async markAsPaid(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            if (user!.user_type !== 'admin' && user!.user_type !== 'super_admin') {
                return this.sendError('Forbidden', 403);
            }

            const { id } = await params;
            
            // Parse FormData
            const formData = await req.formData();
            const receipt = formData.get('receipt') as File | null;
            const transactionReference = formData.get('transactionReference') as string | null;
            const adminNote = formData.get('adminNote') as string | null;

            // Transaction reference is required for paid status
            if (!transactionReference) {
                return this.sendError('Transaction reference is required', 400);
            }

            const payout = await PayoutRequest.findByPk(id);
            if (!payout) return this.sendError('Payout request not found', 404);
            
            // Can only mark as paid if pending or approved
            if (payout.status !== 'pending' && payout.status !== 'approved') {
                return this.sendError('Request must be pending or approved', 400);
            }

            // Double check balance
            const wallet = await FinanceService.getWalletBalance(payout.user_id);
            if (Number(wallet.balance) < Number(payout.amount)) {
                return this.sendError('User has insufficient funds now', 400);
            }

            // Execute Debit Transaction
            await FinanceService.debitWallet(
                payout.user_id,
                payout.amount,
                'payout',
                `Payout Paid (Ref: ${transactionReference})`,
                { payoutRequestId: payout.id, adminId: user!.id },
                null // Destination is external (Bank)
            );

            // TODO: Handle receipt file upload if provided (save to storage and store path)
            let receiptPath = null;
            if (receipt && receipt.size > 0) {
                // For now, just note that we'd save the file here
                // receiptPath = await saveFileToStorage(receipt);
                receiptPath = receipt.name; // Placeholder
            }

            // Update Payout Request
            await payout.update({
                status: 'paid',
                receipt: receiptPath,
                transaction_reference: transactionReference,
                admin_note: adminNote || payout.admin_note,
                approved_by: user!.id,
                approved_at: new Date()
            });

            return this.sendSuccess({ message: 'Payout marked as paid', payout });

        } catch (error: any) {
            return this.sendError(error.message, 500);
        }
    }

    /**
     * POST /api/v1/payouts/:id/reject
     * Admin rejects payout
     */
    async rejectPayout(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        try {
            const { user, error } = await this.verifyAuth(req);
            if (error) return error;

            if (user!.user_type !== 'admin' && user!.user_type !== 'super_admin') {
                return this.sendError('Forbidden', 403);
            }

            const { id } = await params;
            const body = await req.json();
            const { adminNote } = body;

            const payout = await PayoutRequest.findByPk(id);
            if (!payout) return this.sendError('Payout request not found', 404);
            if (payout.status !== 'pending') return this.sendError('Request is not pending', 400);

            await payout.update({
                status: 'rejected',
                admin_note: adminNote,
                approved_by: user!.id, // Rejected by
                approved_at: new Date()
            });

            return this.sendSuccess({ message: 'Payout rejected', payout });

        } catch (error: any) {
             return this.sendError(error.message, 500);
        }
    }
}
