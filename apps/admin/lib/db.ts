// In-memory data store for sdeed-pay admin app

export interface WalletRecord {
  id: string;
  userId: string;
  balance: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRecord {
  id: string;
  referenceId: string;
  fromUserId: string;
  toUserId: string;
  amount: string;
  type: 'TOPUP' | 'PAYOUT' | 'ORDER_PAYMENT' | 'REFUND' | 'FEE';
  appSource: string;
  description?: string | null;
  status: 'PENDING' | 'DONE' | 'FAILED';
  createdAt: string;
}

// Global store to persist across hot reloads in server runtime
const globalForDb = globalThis as unknown as {
  walletsStore?: WalletRecord[];
  transactionsStore?: TransactionRecord[];
};

export const walletsStore: WalletRecord[] = globalForDb.walletsStore || [
  {
    id: 'w-1',
    userId: 'usr_fleet_driver_01',
    balance: '4500000.00',
    currency: 'LBP',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'w-2',
    userId: 'usr_fleet_driver_02',
    balance: '1250000.00',
    currency: 'LBP',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'w-3',
    userId: 'usr_merchant_sdeed_beirut',
    balance: '18750000.00',
    currency: 'LBP',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'w-4',
    userId: 'usr_customer_96170123456',
    balance: '650000.00',
    currency: 'LBP',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'w-5',
    userId: 'usr_customer_96171987654',
    balance: '2100000.00',
    currency: 'LBP',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const transactionsStore: TransactionRecord[] = globalForDb.transactionsStore || [
  {
    id: 'tx-1',
    referenceId: 'TOPUP-usr_merchant_sdeed_beirut-1710000001',
    fromUserId: 'SYSTEM',
    toUserId: 'usr_merchant_sdeed_beirut',
    amount: '20000000.00',
    type: 'TOPUP',
    appSource: 'sdeed-pay',
    description: 'Initial balance topup via Bank Audi transfer',
    status: 'DONE',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'tx-2',
    referenceId: 'ORD-98214-PAY',
    fromUserId: 'usr_customer_96170123456',
    toUserId: 'usr_merchant_sdeed_beirut',
    amount: '850000.00',
    type: 'ORDER_PAYMENT',
    appSource: 'sdeed',
    description: 'Order #98214 checkout payment',
    status: 'DONE',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'tx-3',
    referenceId: 'TRF-FLEET-8831',
    fromUserId: 'usr_merchant_sdeed_beirut',
    toUserId: 'usr_fleet_driver_01',
    amount: '350000.00',
    type: 'ORDER_PAYMENT',
    appSource: 'fleet.os',
    description: 'Delivery courier commission order #98214',
    status: 'DONE',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: 'tx-4',
    referenceId: 'PAYOUT-usr_fleet_driver_01-1710000004',
    fromUserId: 'usr_fleet_driver_01',
    toUserId: 'SYSTEM',
    amount: '1000000.00',
    type: 'PAYOUT',
    appSource: 'sdeed-pay',
    description: 'Weekly driver cashout via OMT',
    status: 'DONE',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'tx-5',
    referenceId: 'TOPUP-usr_fleet_driver_02-1710000005',
    fromUserId: 'SYSTEM',
    toUserId: 'usr_fleet_driver_02',
    amount: '1250000.00',
    type: 'TOPUP',
    appSource: 'sdeed-pay',
    description: 'Admin manual top up',
    status: 'DONE',
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

globalForDb.walletsStore = walletsStore;
globalForDb.transactionsStore = transactionsStore;
