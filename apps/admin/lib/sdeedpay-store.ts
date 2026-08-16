import {
  SpUser,
  SpWithdrawalRequest,
  SpDepositBatch,
  SpDepositClaim,
  SpP2PTransfer,
  KycStatus,
  PaymentMethod,
  BatchStatus,
  PLATFORM_USER_ID,
  getColorTagForAmount,
  CombinationItem,
  usdToPoints,
  pointsToUsd,
  POINTS_PER_USD,
} from './sdeedpay-types';
import { runAiSuggestionEngine } from './ai-suggestion-engine';
import { transactionsStore, TransactionRecord } from './db';

// Global singleton across hot-reloads
interface SdeedpayGlobalState {
  users: SpUser[];
  withdrawals: SpWithdrawalRequest[];
  batches: SpDepositBatch[];
  claims: SpDepositClaim[];
  transfers: SpP2PTransfer[];
  totalClaimsCount: number;
}

const globalForStore = globalThis as unknown as {
  sdeedpayState?: SdeedpayGlobalState;
};

function initializeSeedData(): SdeedpayGlobalState {
  const users: SpUser[] = [
    {
      id: 'usr_kamekaz_worker_01',
      name: 'Rami Al-Hassan (Courier)',
      role: 'worker',
      points_balance: 3400.0, // 3,400 Points = $340.00 USD (10 Point = $1.00 USD)
      phone: '+96170112233',
      wallet_number: '+96170112233',
      preferred_method: 'omt',
      kyc_status: 'verified',
    },
    {
      id: 'usr_kamekaz_worker_02',
      name: 'Nour Khoury (Driver)',
      role: 'worker',
      points_balance: 1800.0, // 1,800 Points = $180.00 USD
      phone: '+96171445566',
      wallet_number: '+96171445566',
      preferred_method: 'wish',
      kyc_status: 'verified',
    },
    {
      id: 'usr_kamekaz_worker_03',
      name: 'Charbel Haddad (Deliveries)',
      role: 'worker',
      points_balance: 900.0, // 900 Points = $90.00 USD
      phone: '+96176889900',
      wallet_number: '+96176889900',
      preferred_method: 'haram',
      kyc_status: 'verified',
    },
    {
      id: 'usr_kamekaz_worker_04',
      name: 'Karim Mansour (Field Ops)',
      role: 'worker',
      points_balance: 4200.0, // 4,200 Points = $420.00 USD
      phone: '+96178990011',
      wallet_number: '+96178990011',
      preferred_method: 'shamcash',
      kyc_status: 'unverified', // Unverified by default to test verification requirement
    },
    {
      id: 'adv_kamekaz_tech_01',
      name: 'ByteCraft Media Agency',
      role: 'advertiser',
      points_balance: 12500.0, // 12,500 Points = $1,250.00 USD
      phone: '+96101998877',
      wallet_number: '+96101998877',
      preferred_method: 'omt',
      kyc_status: 'verified',
    },
    {
      id: 'adv_kamekaz_brands_02',
      name: 'Cedar Commerce Ltd',
      role: 'advertiser',
      points_balance: 6000.0, // 6,000 Points = $600.00 USD
      phone: '+96103554433',
      wallet_number: '+96103554433',
      preferred_method: 'wish',
      kyc_status: 'verified',
    },
    {
      id: 'admin_kamekaz_master',
      name: 'SdeedPay Bank Supervisor',
      role: 'admin',
      points_balance: 0.0,
      phone: '+96101100000',
      wallet_number: 'HQ-OPERATIONS',
      kyc_status: 'verified',
    },
    {
      id: PLATFORM_USER_ID,
      name: 'SdeedPay Platform Treasury (1:9 Commission)',
      role: 'platform',
      points_balance: 850.0, // 850 Points = $85.00 USD
      phone: '+96101999999',
      wallet_number: 'TREASURY-LBP-USD-01',
      kyc_status: 'verified',
    },
  ];

  const now = Date.now();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  // Initialize pool of requests matching prompt examples
  // e.g. Pool=[10,10,10,10,20,20,30,40,50,60]
  const withdrawals: SpWithdrawalRequest[] = [
    {
      id: 'wreq_10_01',
      user_id: 'usr_kamekaz_worker_01',
      amount: 10,
      method: 'omt',
      full_name: 'Rami Tariq Al-Hassan',
      wallet_number: '+96170112233',
      governorate: 'Beirut',
      qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=OMT-PAY-RAMI-10USD',
      status: 'in_pool',
      color_tag: 'green',
      created_at: new Date(now - 40 * minute).toISOString(),
    },
    {
      id: 'wreq_10_02',
      user_id: 'usr_kamekaz_worker_02',
      amount: 10,
      method: 'omt',
      full_name: 'Nour Fadi Khoury',
      wallet_number: '+96171445566',
      governorate: 'Mount Lebanon',
      qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=OMT-PAY-NOUR-10USD',
      status: 'in_pool',
      color_tag: 'green',
      created_at: new Date(now - 35 * minute).toISOString(),
    },
    {
      id: 'wreq_10_03',
      user_id: 'usr_kamekaz_worker_03',
      amount: 10,
      method: 'omt',
      full_name: 'Charbel Joseph Haddad',
      wallet_number: '+96176889900',
      governorate: 'North (Tripoli)',
      qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=OMT-PAY-CHARBEL-10USD',
      status: 'in_pool',
      color_tag: 'green',
      created_at: new Date(now - 30 * minute).toISOString(),
    },
    {
      id: 'wreq_10_04',
      user_id: 'usr_kamekaz_worker_04',
      amount: 10,
      method: 'omt',
      full_name: 'Karim Salim Mansour',
      wallet_number: '+96178990011',
      governorate: 'South (Saida)',
      qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=OMT-PAY-KARIM-10USD',
      status: 'in_pool',
      color_tag: 'green',
      created_at: new Date(now - 25 * minute).toISOString(),
    },
    {
      id: 'wreq_20_01',
      user_id: 'usr_kamekaz_worker_01',
      amount: 20,
      method: 'wish',
      wallet_number: 'WISH-WALLET-961701122',
      governorate: 'Beirut',
      qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=WISH-MONEY-TRANSFER-20USD',
      status: 'in_pool',
      color_tag: 'blue',
      created_at: new Date(now - 50 * minute).toISOString(),
    },
    {
      id: 'wreq_20_02',
      user_id: 'usr_kamekaz_worker_02',
      amount: 20,
      method: 'omt',
      full_name: 'Nour Fadi Khoury',
      wallet_number: '+96171445566',
      governorate: 'Mount Lebanon',
      qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=OMT-PAY-NOUR-20USD',
      status: 'in_pool',
      color_tag: 'blue',
      created_at: new Date(now - 20 * minute).toISOString(),
    },
    {
      id: 'wreq_30_01',
      user_id: 'usr_kamekaz_worker_03',
      amount: 30,
      method: 'haram',
      full_name: 'Charbel Joseph Haddad',
      wallet_number: '+96176889900',
      governorate: 'North (Tripoli)',
      qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=WH-HARAM-30USD',
      status: 'in_pool',
      color_tag: 'orange',
      created_at: new Date(now - 60 * minute).toISOString(),
    },
    {
      id: 'wreq_40_01',
      user_id: 'usr_kamekaz_worker_04',
      amount: 40,
      method: 'omt',
      full_name: 'Karim Salim Mansour',
      wallet_number: '+96178990011',
      governorate: 'South (Saida)',
      qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=OMT-PAY-KARIM-40USD',
      status: 'in_pool',
      color_tag: 'orange',
      created_at: new Date(now - 70 * minute).toISOString(),
    },
    {
      id: 'wreq_50_01',
      user_id: 'usr_kamekaz_worker_01',
      amount: 50,
      method: 'omt',
      full_name: 'Rami Tariq Al-Hassan',
      wallet_number: '+96170112233',
      governorate: 'Beirut',
      qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=OMT-PAY-RAMI-50USD',
      status: 'in_pool',
      color_tag: 'red',
      created_at: new Date(now - 90 * minute).toISOString(),
    },
    {
      id: 'wreq_60_01',
      user_id: 'usr_kamekaz_worker_02',
      amount: 60,
      method: 'shamcash',
      wallet_number: 'SHAM-WALLET-4882190',
      governorate: 'Bekaa (Zahle)',
      qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=SHAMCASH-QR-60USD',
      status: 'in_pool',
      color_tag: 'red',
      created_at: new Date(now - 120 * minute).toISOString(),
    },
  ];

  // Seed sample batch
  const batches: SpDepositBatch[] = [
    {
      id: 'batch_seed_01',
      advertiser_id: 'adv_kamekaz_tech_01',
      requested_amount: 40,
      method: 'omt',
      status: 'pending_admin',
      suggested_combination: [
        {
          amount: 10,
          count: 4,
          request_ids: ['wreq_10_01', 'wreq_10_02', 'wreq_10_03', 'wreq_10_04'],
        },
      ],
      ai_reasoning: [
        'Analyzed available pool of 7 requests for method: OMT. Denominations: 4x$10, 1x$20, 1x$40, 1x$50.',
        '[Optimal Rule Applied]: Protected $40 and $50 bills for large advertisers. Allocated 4x$10 instead.',
      ],
      created_at: new Date(now - 10 * minute).toISOString(),
    },
  ];

  const claims: SpDepositClaim[] = [];

  // Seed initial P2P transfers across last 7 days
  const transfers: SpP2PTransfer[] = [
    {
      id: 'trf_p2p_seed_01',
      from_user_id: 'usr_kamekaz_worker_01',
      to_user_id: 'usr_kamekaz_worker_02',
      to_phone: '+96171445566',
      amount: 25,
      method: 'phone',
      status: 'completed',
      otp_code: '654321',
      from_user_name: 'Rami Al-Hassan (Courier)',
      to_user_name: 'Nour Khoury (Driver)',
      reference_id: 'P2P-96171445566-25USD',
      created_at: new Date(now - 2 * hour).toISOString(),
      completed_at: new Date(now - 118 * minute).toISOString(),
    },
    {
      id: 'trf_p2p_seed_02',
      from_user_id: 'usr_kamekaz_worker_02',
      to_user_id: 'usr_kamekaz_worker_03',
      amount: 15,
      method: 'qr',
      status: 'completed',
      otp_code: '789123',
      from_user_name: 'Nour Khoury (Driver)',
      to_user_name: 'Charbel Haddad (Deliveries)',
      reference_id: 'P2P-QR-CHARBEL-15USD',
      created_at: new Date(now - 4 * hour).toISOString(),
      completed_at: new Date(now - (4 * hour - minute)).toISOString(),
    },
    {
      id: 'trf_p2p_seed_03',
      from_user_id: 'usr_kamekaz_worker_03',
      to_user_id: 'usr_kamekaz_worker_01',
      to_phone: '+96170112233',
      amount: 30,
      method: 'phone',
      status: 'completed',
      otp_code: '341902',
      from_user_name: 'Charbel Haddad (Deliveries)',
      to_user_name: 'Rami Al-Hassan (Courier)',
      reference_id: 'P2P-96170112233-30USD',
      created_at: new Date(now - 1 * day - 3 * hour).toISOString(),
      completed_at: new Date(now - 1 * day - (3 * hour - 2 * minute)).toISOString(),
    },
    {
      id: 'trf_p2p_seed_04',
      from_user_id: 'adv_kamekaz_tech_01',
      to_user_id: 'usr_kamekaz_worker_01',
      amount: 50,
      method: 'qr',
      status: 'completed',
      otp_code: '459128',
      from_user_name: 'ByteCraft Media Agency',
      to_user_name: 'Rami Al-Hassan (Courier)',
      reference_id: 'P2P-QR-RAMI-50USD',
      created_at: new Date(now - 2 * day - 5 * hour).toISOString(),
      completed_at: new Date(now - 2 * day - (5 * hour - minute)).toISOString(),
    },
    {
      id: 'trf_p2p_seed_05',
      from_user_id: 'usr_kamekaz_worker_01',
      to_user_id: 'usr_kamekaz_worker_03',
      to_phone: '+96176889900',
      amount: 20,
      method: 'phone',
      status: 'completed',
      otp_code: '908234',
      from_user_name: 'Rami Al-Hassan (Courier)',
      to_user_name: 'Charbel Haddad (Deliveries)',
      reference_id: 'P2P-96176889900-20USD',
      created_at: new Date(now - 3 * day - 2 * hour).toISOString(),
      completed_at: new Date(now - 3 * day - (2 * hour - minute)).toISOString(),
    },
    {
      id: 'trf_p2p_seed_06',
      from_user_id: 'usr_kamekaz_worker_02',
      to_user_id: 'usr_kamekaz_worker_01',
      amount: 40,
      method: 'qr',
      status: 'completed',
      otp_code: '124987',
      from_user_name: 'Nour Khoury (Driver)',
      to_user_name: 'Rami Al-Hassan (Courier)',
      reference_id: 'P2P-QR-RAMI-40USD',
      created_at: new Date(now - 4 * day - 6 * hour).toISOString(),
      completed_at: new Date(now - 4 * day - (6 * hour - 2 * minute)).toISOString(),
    },
    {
      id: 'trf_p2p_seed_07',
      from_user_id: 'usr_kamekaz_worker_01',
      to_user_id: 'usr_kamekaz_worker_02',
      to_phone: '+96171445566',
      amount: 35,
      method: 'phone',
      status: 'completed',
      otp_code: '671239',
      from_user_name: 'Rami Al-Hassan (Courier)',
      to_user_name: 'Nour Khoury (Driver)',
      reference_id: 'P2P-96171445566-35USD',
      created_at: new Date(now - 5 * day - 4 * hour).toISOString(),
      completed_at: new Date(now - 5 * day - (4 * hour - minute)).toISOString(),
    },
    {
      id: 'trf_p2p_seed_08',
      from_user_id: 'usr_kamekaz_worker_03',
      to_user_id: 'usr_kamekaz_worker_02',
      amount: 15,
      method: 'qr',
      status: 'completed',
      otp_code: '890123',
      from_user_name: 'Charbel Haddad (Deliveries)',
      to_user_name: 'Nour Khoury (Driver)',
      reference_id: 'P2P-QR-NOUR-15USD',
      created_at: new Date(now - 6 * day - 8 * hour).toISOString(),
      completed_at: new Date(now - 6 * day - (8 * hour - minute)).toISOString(),
    },
    // Seed previous week transfers for comparative trend analytics
    {
      id: 'trf_p2p_seed_09',
      from_user_id: 'usr_kamekaz_worker_01',
      to_user_id: 'usr_kamekaz_worker_02',
      to_phone: '+96171445566',
      amount: 20,
      method: 'phone',
      status: 'completed',
      otp_code: '112233',
      from_user_name: 'Rami Al-Hassan (Courier)',
      to_user_name: 'Nour Khoury (Driver)',
      reference_id: 'P2P-96171445566-20USD-PW',
      created_at: new Date(now - 7 * day - 3 * hour).toISOString(),
      completed_at: new Date(now - 7 * day - (3 * hour - minute)).toISOString(),
    },
    {
      id: 'trf_p2p_seed_10',
      from_user_id: 'usr_kamekaz_worker_02',
      to_user_id: 'usr_kamekaz_worker_03',
      amount: 30,
      method: 'qr',
      status: 'completed',
      otp_code: '445566',
      from_user_name: 'Nour Khoury (Driver)',
      to_user_name: 'Charbel Haddad (Deliveries)',
      reference_id: 'P2P-QR-CHARBEL-30USD-PW',
      created_at: new Date(now - 8 * day - 5 * hour).toISOString(),
      completed_at: new Date(now - 8 * day - (5 * hour - minute)).toISOString(),
    },
    {
      id: 'trf_p2p_seed_11',
      from_user_id: 'usr_kamekaz_worker_03',
      to_user_id: 'usr_kamekaz_worker_01',
      to_phone: '+96170112233',
      amount: 25,
      method: 'phone',
      status: 'completed',
      otp_code: '778899',
      from_user_name: 'Charbel Haddad (Deliveries)',
      to_user_name: 'Rami Al-Hassan (Courier)',
      reference_id: 'P2P-96170112233-25USD-PW',
      created_at: new Date(now - 9 * day - 2 * hour).toISOString(),
      completed_at: new Date(now - 9 * day - (2 * hour - minute)).toISOString(),
    },
    {
      id: 'trf_p2p_seed_12',
      from_user_id: 'adv_kamekaz_tech_01',
      to_user_id: 'usr_kamekaz_worker_01',
      amount: 45,
      method: 'qr',
      status: 'completed',
      otp_code: '334455',
      from_user_name: 'ByteCraft Media Agency',
      to_user_name: 'Rami Al-Hassan (Courier)',
      reference_id: 'P2P-QR-RAMI-45USD-PW',
      created_at: new Date(now - 10 * day - 4 * hour).toISOString(),
      completed_at: new Date(now - 10 * day - (4 * hour - minute)).toISOString(),
    },
    {
      id: 'trf_p2p_seed_13',
      from_user_id: 'usr_kamekaz_worker_01',
      to_user_id: 'usr_kamekaz_worker_03',
      to_phone: '+96176889900',
      amount: 15,
      method: 'phone',
      status: 'completed',
      otp_code: '667788',
      from_user_name: 'Rami Al-Hassan (Courier)',
      to_user_name: 'Charbel Haddad (Deliveries)',
      reference_id: 'P2P-96176889900-15USD-PW',
      created_at: new Date(now - 11 * day - 6 * hour).toISOString(),
      completed_at: new Date(now - 11 * day - (6 * hour - minute)).toISOString(),
    },
    {
      id: 'trf_p2p_seed_14',
      from_user_id: 'usr_kamekaz_worker_02',
      to_user_id: 'usr_kamekaz_worker_01',
      amount: 35,
      method: 'qr',
      status: 'completed',
      otp_code: '990011',
      from_user_name: 'Nour Khoury (Driver)',
      to_user_name: 'Rami Al-Hassan (Courier)',
      reference_id: 'P2P-QR-RAMI-35USD-PW',
      created_at: new Date(now - 12 * day - 1 * hour).toISOString(),
      completed_at: new Date(now - 12 * day - (1 * hour - minute)).toISOString(),
    },
    {
      id: 'trf_p2p_seed_15',
      from_user_id: 'usr_kamekaz_worker_01',
      to_user_id: 'usr_kamekaz_worker_02',
      to_phone: '+96171445566',
      amount: 25,
      method: 'phone',
      status: 'completed',
      otp_code: '223344',
      from_user_name: 'Rami Al-Hassan (Courier)',
      to_user_name: 'Nour Khoury (Driver)',
      reference_id: 'P2P-96171445566-25USD-PW2',
      created_at: new Date(now - 13 * day - 5 * hour).toISOString(),
      completed_at: new Date(now - 13 * day - (5 * hour - minute)).toISOString(),
    },
  ];

  return {
    users,
    withdrawals,
    batches,
    claims,
    transfers,
    totalClaimsCount: 8, // Seeded counter so the 9th -> 10th triggers platform commission demonstration
  };
}

if (!globalForStore.sdeedpayState) {
  globalForStore.sdeedpayState = initializeSeedData();
}

const state = globalForStore.sdeedpayState;

export const sdeedpayDb = {
  // Users
  getUsers: () => [...state.users],
  getUser: (id: string) => state.users.find((u) => u.id === id) || null,
  getUserByPhone: (phone: string) => {
    const clean = phone.replace(/\s+/g, '').replace(/-/g, '');
    return (
      state.users.find((u) => {
        const uClean = u.phone.replace(/\s+/g, '').replace(/-/g, '');
        return uClean === clean || uClean.endsWith(clean) || clean.endsWith(uClean);
      }) || null
    );
  },
  updateUserBalance: (id: string, deltaPoints: number) => {
    const user = state.users.find((u) => u.id === id);
    if (user) {
      user.points_balance = Number((user.points_balance + deltaPoints).toFixed(2));
    }
    return user;
  },

  // KYC (Kamekaz User Service)
  getKycStatus: (userId: string): KycStatus => {
    const user = state.users.find((u) => u.id === userId);
    return user?.kyc_status || 'unverified';
  },

  setKycStatus: (userId: string, status: KycStatus) => {
    const user = state.users.find((u) => u.id === userId);
    if (user) {
      user.kyc_status = status;
    }
    return user;
  },

  // Sdeed balance check
  getSdeedBalance: (userId: string): number => {
    const user = state.users.find((u) => u.id === userId);
    return user ? user.points_balance : 0;
  },

  // Withdrawals
  getWithdrawals: (filter?: {
    status?: string;
    userId?: string;
    method?: PaymentMethod;
    colorTag?: string;
  }) => {
    let list = [...state.withdrawals];
    if (filter?.status) list = list.filter((r) => r.status === filter.status);
    if (filter?.userId) list = list.filter((r) => r.user_id === filter.userId);
    if (filter?.method) list = list.filter((r) => r.method === filter.method);
    if (filter?.colorTag) list = list.filter((r) => r.color_tag === filter.colorTag);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getWithdrawal: (id: string) => state.withdrawals.find((r) => r.id === id) || null,

  createWithdrawal: (params: {
    userId: string;
    amount: number;
    method: PaymentMethod;
    fullName?: string;
    walletNumber: string;
    governorate: string;
    qrCodeUrl?: string;
  }) => {
    const { userId, amount, method, fullName, walletNumber, governorate, qrCodeUrl } = params;

    // STEP 1: CALL kamekaz API: GET /user/{user_id}/kyc-status
    const kycStatus = sdeedpayDb.getKycStatus(userId);
    if (kycStatus !== 'verified') {
      throw new Error('Verify identity in kamekaz first');
    }

    if (amount < 10 || amount % 10 !== 0) {
      throw new Error('Amount must be at least $10 and an exact multiple of 10.');
    }

    if ((method === 'haram' || method === 'omt') && (!fullName || fullName.trim().length === 0)) {
      throw new Error(`Full beneficiary name is required for ${method.toUpperCase()} transfers.`);
    }

    if (!walletNumber || walletNumber.trim().length === 0) {
      throw new Error('Wallet number / Phone number is required.');
    }

    // STEP 2: CALL sdeed API: GET /api/sdeed/balance/{user_id}
    const pointsRequired = usdToPoints(amount);
    const user = state.users.find((u) => u.id === userId);
    if (!user || user.points_balance < pointsRequired) {
      throw new Error(
        `Insufficient points balance. Current balance: ${user ? user.points_balance : 0} pts ($${pointsToUsd(user ? user.points_balance : 0).toFixed(2)} USD), requested: $${amount} USD (${pointsRequired} pts) at 10 Point = $1.00 USD.`,
      );
    }

    // Deduct points into escrow lock
    user.points_balance = Number((user.points_balance - pointsRequired).toFixed(2));

    // STEP 3: Create withdrawal request. status='in_pool'
    const colorTag = getColorTagForAmount(amount);
    const newReq: SpWithdrawalRequest = {
      id: `wreq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      user_id: userId,
      amount,
      method,
      full_name: fullName || null,
      wallet_number: walletNumber,
      governorate: governorate || 'Beirut',
      qr_code_url:
        qrCodeUrl ||
        `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${method.toUpperCase()}-${walletNumber}-${amount}USD`,
      status: 'in_pool',
      color_tag: colorTag,
      created_at: new Date().toISOString(),
    };

    state.withdrawals.unshift(newReq);
    return newReq;
  },

  // ==========================================
  // P2P TRANSFERS & QR ENGINE (sdeedpay v1.2.0)
  // ==========================================
  createP2PTransfer: (params: {
    from_user_id: string;
    to: string; // phone or user_id
    amount: number;
    method?: 'qr' | 'phone';
  }) => {
    const { from_user_id, to, amount } = params;

    // STEP 1: CALL kamekaz API: GET /user/{from_user_id}/kyc-status. Must be verified
    const senderKyc = sdeedpayDb.getKycStatus(from_user_id);
    if (senderKyc !== 'verified') {
      throw new Error('Verify identity in kamekaz first');
    }

    const sender = state.users.find((u) => u.id === from_user_id);
    if (!sender) {
      throw new Error('Sender user not found in Kamekaz');
    }

    const numAmount = parseInt(String(amount), 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Transfer amount must be a positive integer ($1 or more)');
    }

    // STEP 2: CALL sdeed API: GET /api/sdeed/balance/{from_user_id}. Check balance (10 Point = $1.00 USD)
    const pointsToTransfer = usdToPoints(numAmount);
    if (sender.points_balance < pointsToTransfer) {
      throw new Error(
        `Insufficient points balance. Current balance: ${sender.points_balance} pts ($${pointsToUsd(sender.points_balance).toFixed(2)} USD), requested: $${numAmount} USD (${pointsToTransfer} pts) at 10 Point = $1.00 USD.`,
      );
    }

    // STEP 3: IF to=phone: Lookup user_id from kamekaz by phone
    let recipient: SpUser | null = null;
    let detectedMethod: 'qr' | 'phone' = params.method || 'phone';
    let toPhone: string | null = null;

    if (to.startsWith('+') || /^\d+$/.test(to.replace(/[\s-]/g, ''))) {
      detectedMethod = 'phone';
      toPhone = to;
      recipient = sdeedpayDb.getUserByPhone(to);
      if (!recipient) {
        throw new Error(`Recipient with phone ${to} is not registered in Kamekaz`);
      }
    } else {
      // Try by user_id
      recipient = state.users.find((u) => u.id === to) || null;
      if (!recipient) {
        // Fallback: check if 'to' is a phone without leading plus
        recipient = sdeedpayDb.getUserByPhone(to);
      }
      if (!recipient) {
        throw new Error(`Recipient user ID "${to}" was not found in Kamekaz`);
      }
      if (params.method) detectedMethod = params.method;
    }

    if (recipient.id === sender.id) {
      throw new Error('Self-transfer is not allowed. Choose a different recipient.');
    }

    // STEP 4: Generate OTP 6 digits. Send to from_user_id phone via SMS
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const transferId = `trf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // STEP 5: Create sp_p2p_transfers.status='pending_otp'
    const newTransfer: SpP2PTransfer = {
      id: transferId,
      from_user_id: sender.id,
      to_user_id: recipient.id,
      to_phone: toPhone || recipient.phone,
      amount: numAmount,
      method: detectedMethod,
      status: 'pending_otp',
      otp_code: otpCode,
      from_user_name: sender.name,
      to_user_name: recipient.name,
      reference_id: `P2P-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
    };

    state.transfers.unshift(newTransfer);

    return {
      transfer: newTransfer,
      otp_code: otpCode,
      sender_phone: sender.phone,
      recipient_name: recipient.name,
      message: `6-digit OTP (${otpCode}) sent via SMS to ${sender.phone}. Confirm to finalize transfer.`,
    };
  },

  confirmP2PTransfer: (params: { transfer_id: string; otp: string }) => {
    const { transfer_id, otp } = params;

    const transfer = state.transfers.find((t) => t.id === transfer_id);
    if (!transfer) {
      throw new Error('Transfer record not found');
    }

    if (transfer.status === 'completed') {
      throw new Error('Transfer is already completed');
    }

    if (transfer.status === 'cancelled') {
      throw new Error('Transfer has been cancelled');
    }

    // Validate OTP (allow demo master code '000000' or actual OTP)
    if (transfer.otp_code !== otp.trim() && otp.trim() !== '000000') {
      throw new Error('Invalid OTP code. Please enter the 6-digit code sent to your phone.');
    }

    const sender = state.users.find((u) => u.id === transfer.from_user_id);
    const recipient = state.users.find((u) => u.id === transfer.to_user_id);

    if (!sender || !recipient) {
      throw new Error('Sender or Recipient user account not found');
    }

    const pointsToTransfer = usdToPoints(transfer.amount);
    if (sender.points_balance < pointsToTransfer) {
      throw new Error(
        `Insufficient funds: sender balance is ${sender.points_balance} pts ($${pointsToUsd(sender.points_balance).toFixed(2)} USD), required: ${pointsToTransfer} pts ($${transfer.amount} USD)`,
      );
    }

    // STEP: CALL sdeedpay: deduct points from sender, add points to recipient (10 Point = $1.00 USD)
    sender.points_balance = Number((sender.points_balance - pointsToTransfer).toFixed(2));
    recipient.points_balance = Number((recipient.points_balance + pointsToTransfer).toFixed(2));

    // Update transfer status
    transfer.status = 'completed';
    transfer.completed_at = new Date().toISOString();

    // STEP: CALL sdeed API webhook to update both transactions ledgers
    const txSender: TransactionRecord = {
      id: `tx-p2p-out-${Date.now()}`,
      referenceId: `${transfer.reference_id}-DEBIT`,
      fromUserId: sender.id,
      toUserId: recipient.id,
      amount: `${transfer.amount}.00`,
      type: 'PAYOUT',
      appSource: 'sdeed-pay',
      description: `P2P Transfer to ${recipient.name} (${transfer.method.toUpperCase()})`,
      status: 'DONE',
      createdAt: new Date().toISOString(),
    };

    const txRecipient: TransactionRecord = {
      id: `tx-p2p-in-${Date.now()}`,
      referenceId: `${transfer.reference_id}-CREDIT`,
      fromUserId: sender.id,
      toUserId: recipient.id,
      amount: `${transfer.amount}.00`,
      type: 'TOPUP',
      appSource: 'sdeed-pay',
      description: `P2P Transfer from ${sender.name} (${transfer.method.toUpperCase()})`,
      status: 'DONE',
      createdAt: new Date().toISOString(),
    };

    transactionsStore.unshift(txSender);
    transactionsStore.unshift(txRecipient);

    return {
      transfer,
      sender_balance: sender.points_balance,
      recipient_balance: recipient.points_balance,
    };
  },

  cancelP2PTransfer: (transfer_id: string) => {
    const transfer = state.transfers.find((t) => t.id === transfer_id);
    if (!transfer) throw new Error('Transfer not found');
    if (transfer.status !== 'pending_otp') {
      throw new Error(`Cannot cancel transfer in status: ${transfer.status}`);
    }
    transfer.status = 'cancelled';
    return transfer;
  },

  getP2PTransfers: (userId?: string) => {
    let list = [...state.transfers];
    if (userId) {
      list = list.filter((t) => t.from_user_id === userId || t.to_user_id === userId);
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  // Deposit Batches
  createDepositRequest: (params: {
    advertiserId: string;
    amount: number;
    method: PaymentMethod;
  }) => {
    const { advertiserId, amount, method } = params;

    if (amount < 10 || amount % 10 !== 0) {
      throw new Error('Deposit amount must be at least $10 and an exact multiple of 10.');
    }

    // Run AI Suggestion Engine
    const availablePool = state.withdrawals.filter(
      (r) => r.status === 'in_pool' && r.method === method,
    );

    const aiResult = runAiSuggestionEngine(state.withdrawals, amount, method);

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const newBatch: SpDepositBatch = {
      id: batchId,
      advertiser_id: advertiserId,
      requested_amount: amount,
      method,
      status: 'pending_admin',
      suggested_combination: aiResult.suggested_combination,
      alternatives: aiResult.alternatives,
      ai_reasoning: aiResult.ai_reasoning,
      created_at: new Date().toISOString(),
    };

    state.batches.unshift(newBatch);

    return {
      batch_id: batchId,
      batch: newBatch,
      suggestion: aiResult.suggested_combination,
      alternatives: aiResult.alternatives,
      ai_reasoning: aiResult.ai_reasoning,
      exactMatchFound: aiResult.exactMatchFound,
    };
  },

  getBatches: (filter?: { status?: BatchStatus; advertiserId?: string }) => {
    let list = [...state.batches];
    if (filter?.status) list = list.filter((b) => b.status === filter.status);
    if (filter?.advertiserId) list = list.filter((b) => b.advertiser_id === filter.advertiserId);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getBatch: (id: string) => state.batches.find((b) => b.id === id) || null,

  approveBatch: (batchId: string, customCombination?: CombinationItem[]) => {
    const batch = state.batches.find((b) => b.id === batchId);
    if (!batch) throw new Error('Batch not found');
    if (batch.status !== 'pending_admin') {
      throw new Error(`Batch cannot be approved. Current status: ${batch.status}`);
    }

    const combinationToUse = customCombination || batch.suggested_combination;
    if (!combinationToUse || combinationToUse.length === 0) {
      throw new Error('No combination items available to approve this batch.');
    }

    // Extract all request IDs
    const requestIds = combinationToUse.flatMap((item) => item.request_ids);

    // Verify all requests are still in_pool
    const requests = state.withdrawals.filter((r) => requestIds.includes(r.id));
    const notAvailable = requests.filter((r) => r.status !== 'in_pool');
    if (notAvailable.length > 0) {
      throw new Error(
        `Some withdrawal requests in this combination are no longer available in the pool.`,
      );
    }

    // Lock requests -> 'reserved'
    requests.forEach((r) => {
      r.status = 'reserved';
      r.batch_id = batch.id;
      r.updated_at = new Date().toISOString();
    });

    batch.status = 'approved';
    batch.admin_final_combination = combinationToUse;
    batch.updated_at = new Date().toISOString();

    // Create deposit claims for each request
    const generatedClaims: SpDepositClaim[] = [];

    requests.forEach((req) => {
      state.totalClaimsCount += 1;

      const claim: SpDepositClaim = {
        id: `claim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        batch_id: batch.id,
        withdrawal_request_id: req.id,
        advertiser_id: batch.advertiser_id,
        worker_id: req.user_id,
        amount: req.amount,
        method: req.method,
        // Card privacy logic: If haram or omt -> show full name. If wish/shamcash -> hide/null
        beneficiary_full_name:
          req.method === 'haram' || req.method === 'omt' ? req.full_name : null,
        wallet_number: req.wallet_number,
        governorate: req.governorate,
        qr_code_url: req.qr_code_url,
        status: 'advertiser_sent',
        is_platform_commission: false,
        created_at: new Date().toISOString(),
      };

      state.claims.unshift(claim);
      generatedClaims.push(claim);

      // COMMISSION RULE: For every 9 claims created, create 1 platform commission claim for PLATFORM_USER_ID
      if (state.totalClaimsCount % 9 === 0) {
        const commClaim: SpDepositClaim = {
          id: `comm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          batch_id: batch.id,
          withdrawal_request_id: `platform_fee_${Date.now()}`,
          advertiser_id: batch.advertiser_id,
          worker_id: PLATFORM_USER_ID,
          amount: 5, // $5 platform service fee
          method: batch.method,
          beneficiary_full_name: 'SdeedPay Platform Treasury',
          wallet_number: 'TREASURY-AUTO-ESCROW',
          governorate: 'HQ Central',
          qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=SDEEDPAY-TREASURY-COMMISSION',
          status: 'advertiser_sent',
          is_platform_commission: true,
          created_at: new Date().toISOString(),
        };
        state.claims.unshift(commClaim);
        generatedClaims.push(commClaim);
      }
    });

    return {
      batch,
      claims: generatedClaims,
    };
  },

  rejectBatch: (batchId: string, reason?: string) => {
    const batch = state.batches.find((b) => b.id === batchId);
    if (!batch) throw new Error('Batch not found');

    batch.status = 'rejected';
    batch.rejection_reason = reason || 'Rejected by admin';
    batch.updated_at = new Date().toISOString();

    // Release any requests attached to this batch back to in_pool
    state.withdrawals
      .filter((r) => r.batch_id === batchId)
      .forEach((r) => {
        r.status = 'in_pool';
        r.batch_id = null;
      });

    return batch;
  },

  // Cards & Claims
  getBatchCards: (batchId: string) => {
    const batch = state.batches.find((b) => b.id === batchId);
    if (!batch) throw new Error('Batch not found');

    // Retrieve claims for this batch
    let batchClaims = state.claims.filter((c) => c.batch_id === batchId);

    // If batch is approved but claims haven't been created yet, generate them
    if (batch.status === 'approved' && batchClaims.length === 0) {
      const combo = batch.admin_final_combination || batch.suggested_combination;
      const requestIds = combo.flatMap((item) => item.request_ids);
      const reqs = state.withdrawals.filter((r) => requestIds.includes(r.id));

      reqs.forEach((r) => {
        const claim: SpDepositClaim = {
          id: `claim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          batch_id: batch.id,
          withdrawal_request_id: r.id,
          advertiser_id: batch.advertiser_id,
          worker_id: r.user_id,
          amount: r.amount,
          method: r.method,
          beneficiary_full_name:
            r.method === 'haram' || r.method === 'omt' ? r.full_name : null,
          wallet_number: r.wallet_number,
          governorate: r.governorate,
          qr_code_url: r.qr_code_url,
          status: 'advertiser_sent',
          created_at: new Date().toISOString(),
        };
        state.claims.unshift(claim);
      });
      batchClaims = state.claims.filter((c) => c.batch_id === batchId);
    }

    return {
      batch,
      cards: batchClaims,
    };
  },

  submitAdvertiserProof: (claimId: string, proofUrl: string, reference?: string) => {
    const claim = state.claims.find((c) => c.id === claimId);
    if (!claim) throw new Error('Claim not found');

    claim.advertiser_proof_url = proofUrl;
    claim.advertiser_reference = reference || null;
    claim.advertiser_sent_at = new Date().toISOString();
    claim.status = 'advertiser_sent';

    // If worker has also sent proof, auto-match!
    if (claim.worker_proof_url) {
      claim.status = 'matched';
      // Mark withdrawal request as paid
      const req = state.withdrawals.find((r) => r.id === claim.withdrawal_request_id);
      if (req) req.status = 'paid';

      // Credit advertiser points (10 Point = $1.00 USD)
      const advertiser = state.users.find((u) => u.id === claim.advertiser_id);
      if (advertiser) {
        advertiser.points_balance = Number(
          (advertiser.points_balance + usdToPoints(claim.amount)).toFixed(2),
        );
      }
    }

    return claim;
  },

  submitWorkerProof: (claimId: string, proofUrl: string) => {
    const claim = state.claims.find((c) => c.id === claimId);
    if (!claim) throw new Error('Claim not found');

    claim.worker_proof_url = proofUrl;
    claim.worker_confirmed_at = new Date().toISOString();
    claim.status = 'matched';

    // Update withdrawal request
    const req = state.withdrawals.find((r) => r.id === claim.withdrawal_request_id);
    if (req) req.status = 'paid';

    // Credit advertiser balance (10 Point = $1.00 USD)
    const advertiser = state.users.find((u) => u.id === claim.advertiser_id);
    if (advertiser) {
      advertiser.points_balance = Number(
        (advertiser.points_balance + usdToPoints(claim.amount)).toFixed(2),
      );
    }

    return claim;
  },

  disputeClaim: (claimId: string, reason: string) => {
    const claim = state.claims.find((c) => c.id === claimId);
    if (!claim) throw new Error('Claim not found');

    claim.status = 'disputed';
    claim.dispute_reason = reason;

    const req = state.withdrawals.find((r) => r.id === claim.withdrawal_request_id);
    if (req) req.status = 'disputed';

    return claim;
  },

  getClaims: (filter?: { batchId?: string; status?: string; workerId?: string; advertiserId?: string }) => {
    let list = [...state.claims];
    if (filter?.batchId) list = list.filter((c) => c.batch_id === filter.batchId);
    if (filter?.status) list = list.filter((c) => c.status === filter.status);
    if (filter?.workerId) list = list.filter((c) => c.worker_id === filter.workerId);
    if (filter?.advertiserId) list = list.filter((c) => c.advertiser_id === filter.advertiserId);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  resetToSeed: () => {
    globalForStore.sdeedpayState = initializeSeedData();
    return globalForStore.sdeedpayState;
  },
};

