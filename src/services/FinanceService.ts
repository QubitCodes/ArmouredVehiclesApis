import { sequelize } from '../config/database';
import { UserWallet, Transaction, PlatformSetting, User, FinancialLog } from '../models';
import { Op, Transaction as SequelizeTransaction } from 'sequelize';

export class FinanceService {

    /**
     * Ensure a user has a wallet. If not, create one.
     */
    static async ensureWallet(userId: string, transaction?: SequelizeTransaction): Promise<UserWallet> {
        const wallet = await UserWallet.findOne({ 
            where: { user_id: userId },
            transaction 
        });

        if (wallet) return wallet;

        return await UserWallet.create({
            user_id: userId,
            balance: 0.00,
            locked_balance: 0.00
        }, { transaction });
    }

    /**
     * Credit a user's wallet (e.g. Vendor Earning, Commission)
     * If 'locked' is true, funds go to locked_balance.
     */
    static async creditWallet(
        userId: string, 
        amount: number, 
        type: 'purchase' | 'commission' | 'vendor_earning' | 'refund' | 'adjustment',
        description: string,
        metadata: any = {},
        sourceUserId: string | null = null,
        locked: boolean = false,
        orderId: string | null = null,
        dbTransaction?: SequelizeTransaction
    ): Promise<Transaction> {
        const t = dbTransaction || await sequelize.transaction();

        try {
            const wallet = await this.ensureWallet(userId, t);
            const numAmount = Number(amount);

            // Create Transaction Record
            const transactionRecord = await Transaction.create({
                type,
                source_user_id: sourceUserId,
                destination_user_id: userId,
                amount: numAmount,
                status: locked ? 'locked' : 'completed',
                description,
                metadata,
                order_id: orderId,
                // If locked, calculate unlock time based on platform settings
                unlock_at: locked ? await this.calculateUnlockDate(t) : null
            }, { transaction: t });

            // Update Wallet Balance
            if (locked) {
                await wallet.increment('locked_balance', { by: numAmount, transaction: t });
            } else {
                await wallet.increment('balance', { by: numAmount, transaction: t });
            }

            if (!dbTransaction) await t.commit();
            return transactionRecord;

        } catch (error) {
            if (!dbTransaction) await t.rollback();
            throw error;
        }
    }

    /**
     * Debit a user's wallet (e.g. Payout, Refund deduction)
     */
    static async debitWallet(
        userId: string,
        amount: number,
        type: 'payout' | 'refund' | 'adjustment',
        description: string,
        metadata: any = {},
        destinationUserId: string | null = null,
        dbTransaction?: SequelizeTransaction
    ): Promise<Transaction> {
        const t = dbTransaction || await sequelize.transaction();

        try {
            const wallet = await this.ensureWallet(userId, t);
            const numAmount = Number(amount);

            if (Number(wallet.balance) < numAmount) {
                throw new Error('Insufficient funds');
            }

            // Create Transaction
            const transactionRecord = await Transaction.create({
                type,
                source_user_id: userId,
                destination_user_id: destinationUserId,
                amount: numAmount,
                status: 'completed',
                description,
                metadata
            }, { transaction: t });

            // Decrement Balance
            await wallet.decrement('balance', { by: numAmount, transaction: t });

            if (!dbTransaction) await t.commit();
            return transactionRecord;

        } catch (error) {
            if (!dbTransaction) await t.rollback();
            throw error;
        }
    }

    /**
     * Unlock funds that have passed their unlock_at time
     */
    static async processUnlockFunds(): Promise<{ unlockedCount: number, totalAmount: number }> {
        const t = await sequelize.transaction();
        let unlockedCount = 0;
        let totalAmount = 0;

        try {
            // Find all locked transactions that are ready to unlock
            const lockedTransactions = await Transaction.findAll({
                where: {
                    status: 'locked',
                    unlock_at: {
                        [Op.lte]: new Date() // unlock_at <= NOW
                    }
                },
                transaction: t,
                lock: true // Pessimistic lock to prevent race conditions
            });

            for (const trx of lockedTransactions) {
                if (!trx.destination_user_id) continue;

                const wallet = await UserWallet.findOne({ 
                    where: { user_id: trx.destination_user_id },
                    transaction: t 
                });

                if (wallet) {
                    const amount = Number(trx.amount);
                    
                    // Move from locked to available
                    await wallet.decrement('locked_balance', { by: amount, transaction: t });
                    await wallet.increment('balance', { by: amount, transaction: t });

                    // Update Transaction Status
                    await trx.update({ status: 'completed' }, { transaction: t });

                    unlockedCount++;
                    totalAmount += amount;
                }
            }

            await t.commit();
            return { unlockedCount, totalAmount };

        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Calculate unlock date based on Platform Settings
     */
    private static async calculateUnlockDate(transaction?: SequelizeTransaction): Promise<Date> {
        const setting = await PlatformSetting.findOne({ 
            where: { key: 'product_return_period' },
            transaction 
        });

        const days = setting && setting.value ? parseInt(setting.value) : 10; // Default 10 days
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date;
    }

    /**
     * Get User Wallet Balance
     */
    static async getWalletBalance(userId: string) {
        return await this.ensureWallet(userId);
    }

    /**
     * Get Transaction History
     */
    static async getTransactionHistory(userId: string, limit: number = 20, offset: number = 0) {
        return await Transaction.findAndCountAll({
            where: {
                [Op.or]: [
                    { source_user_id: userId },
                    { destination_user_id: userId }
                ]
            },
            order: [['created_at', 'DESC']],
            limit,
            offset,
            include: [
                { model: User, as: 'source', attributes: ['name', 'email'] },
                { model: User, as: 'destination', attributes: ['name', 'email'] }
            ]
        });
    }
    /**
     * Get Financial Logs
     */
    static async getFinancialLogs(userId: string, limit: number = 20, offset: number = 0) {
        // Need to import FinancialLog at top if not inferred, but let's check imports
        // FinancialLog is likely in ../models but not imported in FinanceService.ts
        // I will rely on auto-import or fix imports in next step if generic
        // Actually, better to fix imports first.
        return await FinancialLog.findAndCountAll({ 
             where: { user_id: userId },
             order: [['created_at', 'DESC']],
             limit,
             offset
        }); 
    }
}
