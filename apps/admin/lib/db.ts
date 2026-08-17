// Sadeed Pay Database Engine & In-Memory Store
// Matches Prisma Schema: Wallets (with Kamekaz KYC Tier) & Transactions (linked to wallet_id)
// Rule: No personal identity data stored - only user_id, tier, and balances.

import { KycTier, getKamekazKycStatus } from './kamekaz-kyc';

export interface WalletRecord {
  id: string;
  userId: string;
  tier: KycTier;
  balance: string; // Decimal string representation
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRecord {
  id: string;
  walletId: string;
  referenceId: string;
  fromUserId: string;
  toUserId: string;
  amount: string;
  type: 'TOPUP' | 'PAYOUT' | 'ORDER_PAYMENT' | 'REFUND' | 'FEE';
  appSource: string; // 'sadeed-pay' | 'merchant' | 'kamekaz' | 'p2p'
  description?: string | null;
  metadata?: Record<string, any> | string | null;
  status: 'PENDING' | 'DONE' | 'FAILED';
  createdAt: string;
}

// Global store across hot reloads
const globalForDb = globalThis as unknown as {
  walletsStore?: WalletRecord[];
  transactionsStore?: TransactionRecord[];
};

function getInitialWallets(): WalletRecord[] {
  return [
    {
      id: 'w-merchant-01',
      userId: 'usr_merchant_sdeed_beirut',
      tier: 'C3',
      balance: '12450.00',
      currency: 'USD',
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'w-adv-01',
      userId: 'adv_kamekaz_tech_01',
      tier: 'C2',
      balance: '3500.00',
      currency: 'USD',
      createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'w-driver-01',
      userId: 'usr_fleet_driver_01',
      tier: 'C2',
      balance: '820.00',
      currency: 'USD',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'w-cust-01',
      userId: 'usr_customer_96170123456',
      tier: 'C1',
      balance: '350.00',
      currency: 'USD',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'w-cust-02',
      userId: 'usr_customer_96171987654',
      tier: 'C1',
      balance: '480.00',
      currency: 'USD',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'w-worker-01',
      userId: 'usr_kamekaz_worker_01',
      tier: 'C2',
      balance: '940.00',
      currency: 'USD',
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

function getInitialTransactions(): TransactionRecord[] {
  return [
    {
      id: 'tx-seed-1',
      walletId: 'w-merchant-01',
      referenceId: 'TOPUP-MERCHANT-INIT-901',
      fromUserId: 'SYSTEM',
      toUserId: 'usr_merchant_sdeed_beirut',
      amount: '10000.00',
      type: 'TOPUP',
      appSource: 'sadeed-pay',
      description: 'Initial merchant liquidity deposit via Sadeed Pay API',
      metadata: { channel: 'bank_transfer', verified_by: 'admin_kamekaz_master' },
      status: 'DONE',
      createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    },
    {
      id: 'tx-seed-2',
      walletId: 'w-merchant-01',
      referenceId: 'PAY-ORD-98214-BEIRUT',
      fromUserId: 'adv_kamekaz_tech_01',
      toUserId: 'usr_merchant_sdeed_beirut',
      amount: '120.00',
      type: 'ORDER_PAYMENT',
      appSource: 'merchant',
      description: 'Sadeed Pay Checkout for Order #98214',
      metadata: { order_id: '98214', payer_tier: 'C2' },
      status: 'DONE',
      createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
    },
    {
      id: 'tx-seed-3',
      walletId: 'w-driver-01',
      referenceId: 'TOPUP-DRIVER-01-EARNINGS',
      fromUserId: 'SYSTEM',
      toUserId: 'usr_fleet_driver_01',
      amount: '320.00',
      type: 'TOPUP',
      appSource: 'kamekaz',
      description: 'Delivery Courier Task Commissions',
      metadata: { batch_count: 8 },
      status: 'DONE',
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
  ];
}

if (!globalForDb.walletsStore) {
  globalForDb.walletsStore = getInitialWallets();
}
if (!globalForDb.transactionsStore) {
  globalForDb.transactionsStore = getInitialTransactions();
}

export const walletsStore: WalletRecord[] = globalForDb.walletsStore;
export const transactionsStore: TransactionRecord[] = globalForDb.transactionsStore;

export class SadeedDbService {
  /**
   * Find wallet by userId
   */
  static findWalletByUserId(userId: string): WalletRecord | undefined {
    if (!userId) return undefined;
    const cleanId = userId.trim().toLowerCase();
    return walletsStore.find((w) => w.userId.toLowerCase() === cleanId);
  }

  /**
   * Find wallet by wallet ID
   */
  static findWalletById(walletId: string): WalletRecord | undefined {
    return walletsStore.find((w) => w.id === walletId);
  }

  /**
   * Ensure wallet exists for user. If not, queries Kamekaz KYC to store tier in DB.
   */
  static async getOrCreateWallet(userId: string, initialBalance = '0.00', currency = 'USD'): Promise<WalletRecord> {
    const existing = this.findWalletByUserId(userId);
    if (existing) {
      return existing;
    }

    // Direct KYC call to Kamekaz to fetch tier
    const kyc = await getKamekazKycStatus(userId);
    const newWallet: WalletRecord = {
      id: `w-${userId.replace(/[^a-zA-Z0-9_-]/g, '')}-${Math.random().toString(36).slice(2, 7)}`,
      userId: userId.trim(),
      tier: kyc.tier,
      balance: parseFloat(initialBalance || '0').toFixed(2),
      currency,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    walletsStore.unshift(newWallet);
    return newWallet;
  }

  /**
   * Update tier of a wallet
   */
  static updateWalletTier(userId: string, tier: KycTier): WalletRecord | undefined {
    const wallet = this.findWalletByUserId(userId);
    if (wallet) {
      wallet.tier = tier;
      wallet.updatedAt = new Date().toISOString();
    }
    return wallet;
  }

  /**
   * Add a new transaction linked to wallet_id
   */
  static logTransaction(params: {
    walletId: string;
    referenceId: string;
    fromUserId: string;
    toUserId: string;
    amount: number | string;
    type: 'TOPUP' | 'PAYOUT' | 'ORDER_PAYMENT' | 'REFUND' | 'FEE';
    appSource?: string;
    description?: string;
    metadata?: any;
    status?: 'PENDING' | 'DONE' | 'FAILED';
  }): TransactionRecord {
    const amountStr = typeof params.amount === 'number' ? params.amount.toFixed(2) : parseFloat(params.amount).toFixed(2);
    const tx: TransactionRecord = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      walletId: params.walletId,
      referenceId: params.referenceId,
      fromUserId: params.fromUserId,
      toUserId: params.toUserId,
      amount: amountStr,
      type: params.type,
      appSource: params.appSource || 'sadeed-pay',
      description: params.description || null,
      metadata: params.metadata || null,
      status: params.status || 'DONE',
      createdAt: new Date().toISOString(),
    };

    transactionsStore.unshift(tx);
    return tx;
  }

  /**
   * Top up a wallet and log a new Transaction
   */
  static async topupWallet(params: {
    userId: string;
    amount: number;
    channel?: string;
    description?: string;
  }): Promise<{ wallet: WalletRecord; transaction: TransactionRecord }> {
    const { userId, amount, channel = 'direct_topup', description } = params;
    if (amount <= 0) {
      throw new Error('Topup amount must be positive');
    }

    const wallet = await this.getOrCreateWallet(userId);
    const currentBal = parseFloat(wallet.balance);
    const newBal = (currentBal + amount).toFixed(2);

    wallet.balance = newBal;
    wallet.updatedAt = new Date().toISOString();

    const refId = `TOPUP-${wallet.userId}-${Date.now()}`;
    const tx = this.logTransaction({
      walletId: wallet.id,
      referenceId: refId,
      fromUserId: 'SYSTEM',
      toUserId: wallet.userId,
      amount,
      type: 'TOPUP',
      appSource: 'sadeed-pay',
      description: description || `Wallet Topup of $${amount.toFixed(2)} (${channel})`,
      metadata: { channel, tier_at_topup: wallet.tier },
      status: 'DONE',
    });

    return { wallet, transaction: tx };
  }

  /**
   * Process payment between payer and merchant
   * Must log transactions for both and update balances
   */
  static async processPayment(params: {
    payerUserId: string;
    merchantUserId: string;
    amount: number;
    orderId?: string;
    description?: string;
    metadata?: any;
  }): Promise<{
    referenceId: string;
    payerWallet: WalletRecord;
    merchantWallet: WalletRecord;
    payerTx: TransactionRecord;
    merchantTx: TransactionRecord;
  }> {
    const { payerUserId, merchantUserId, amount, orderId, description, metadata } = params;

    if (amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    const payerWallet = await this.getOrCreateWallet(payerUserId);
    const merchantWallet = await this.getOrCreateWallet(merchantUserId);

    const payerBal = parseFloat(payerWallet.balance);
    if (payerBal < amount) {
      const err: any = new Error(
        `رصيد المحفظة غير كافٍ. الرصيد المتوفر $${payerBal.toFixed(2)} والمطلوب $${amount.toFixed(2)}`,
      );
      err.statusCode = 400;
      err.code = 'INSUFFICIENT_FUNDS';
      throw err;
    }

    // Deduct from payer
    payerWallet.balance = (payerBal - amount).toFixed(2);
    payerWallet.updatedAt = new Date().toISOString();

    // Credit to merchant
    const merchantBal = parseFloat(merchantWallet.balance);
    merchantWallet.balance = (merchantBal + amount).toFixed(2);
    merchantWallet.updatedAt = new Date().toISOString();

    const referenceId = `PAY-${orderId || Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // Transaction for payer (Debit)
    const payerTx = this.logTransaction({
      walletId: payerWallet.id,
      referenceId: `${referenceId}-DEBIT`,
      fromUserId: payerUserId,
      toUserId: merchantUserId,
      amount,
      type: 'ORDER_PAYMENT',
      appSource: 'merchant',
      description: description || `Payment to merchant ${merchantUserId} for order ${orderId || 'N/A'}`,
      metadata: { ...metadata, referenceId, orderId, role: 'payer' },
      status: 'DONE',
    });

    // Transaction for merchant (Credit)
    const merchantTx = this.logTransaction({
      walletId: merchantWallet.id,
      referenceId: `${referenceId}-CREDIT`,
      fromUserId: payerUserId,
      toUserId: merchantUserId,
      amount,
      type: 'ORDER_PAYMENT',
      appSource: 'merchant',
      description: description || `Payment received from ${payerUserId} for order ${orderId || 'N/A'}`,
      metadata: { ...metadata, referenceId, orderId, role: 'merchant' },
      status: 'DONE',
    });

    return {
      referenceId,
      payerWallet,
      merchantWallet,
      payerTx,
      merchantTx,
    };
  }

  /**
   * Reset database to seed
   */
  static resetState() {
    globalForDb.walletsStore = getInitialWallets();
    globalForDb.transactionsStore = getInitialTransactions();
    walletsStore.length = 0;
    walletsStore.push(...globalForDb.walletsStore);
    transactionsStore.length = 0;
    transactionsStore.push(...globalForDb.transactionsStore);
  }
}
