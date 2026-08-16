import {
  SpUser,
  SpWithdrawalRequest,
  SpDepositBatch,
  SpDepositClaim,
  SpP2PTransfer,
  PaymentMethod,
  CombinationItem,
  AlternativeCombination,
} from './sdeedpay-types';

export class SdeedpayApiError extends Error {
  status: number;
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'SdeedpayApiError';
    this.status = status;
  }
}

export const API_BASE_UI =
  process.env.NEXT_PUBLIC_API_BASE_UI || 'https://sdeed-pay-v3-2-5.vercel.app';

export const KAMEKAZ_API_URL =
  process.env.NEXT_PUBLIC_KAMEKAZ_API || 'https://kamekaz-v3-2-5.vercel.app';

export const SDEED_API_URL =
  process.env.NEXT_PUBLIC_SDEED_API || 'https://sdeed-v3-2-5.vercel.app';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = url.startsWith('http')
    ? url
    : url.startsWith('/api')
    ? url
    : `${API_BASE_UI}${url.startsWith('/') ? '' : '/'}${url}`;

  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorMsg = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) errorMsg = data.message;
    } catch {
      // ignore
    }
    throw new SdeedpayApiError(errorMsg, res.status);
  }

  return res.json();
}

export const sdeedpayApi = {
  // Users
  getUsers: () => request<SpUser[]>('/api/v1/users'),

  // Withdrawals (Worker)
  createWithdrawal: (params: {
    user_id: string;
    amount: number;
    method: PaymentMethod;
    full_name?: string;
    wallet_number: string;
    governorate: string;
    qr_code_url?: string;
  }) =>
    request<{ message: string; request: SpWithdrawalRequest }>('/api/v1/withdraw/request', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getUserWithdrawals: (userId: string) =>
    request<SpWithdrawalRequest[]>(`/api/v1/withdraw/request?userId=${encodeURIComponent(userId)}`),

  // Liquidity Pool (Admin)
  getPool: (method?: PaymentMethod, colorTag?: string) => {
    const params = new URLSearchParams();
    if (method) params.set('method', method);
    if (colorTag) params.set('colorTag', colorTag);
    return request<{
      stats: {
        totalLiquidity: number;
        totalCount: number;
        greenCount: number;
        blueCount: number;
        orangeCount: number;
        redCount: number;
        byMethod: Record<PaymentMethod, number>;
      };
      requests: SpWithdrawalRequest[];
    }>(`/api/v1/withdraw/pool?${params.toString()}`);
  },

  // Deposit Requests & Batches (Advertiser)
  createDepositRequest: (params: {
    advertiser_id: string;
    amount: number;
    method: PaymentMethod;
  }) =>
    request<{
      batch_id: string;
      status: string;
      requested_amount: number;
      method: PaymentMethod;
      suggestion: CombinationItem[];
      alternatives: AlternativeCombination[];
      ai_reasoning: string[];
      exactMatchFound: boolean;
      message: string;
    }>('/api/v1/deposit/request', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getBatches: (status?: string, advertiserId?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (advertiserId) params.set('advertiserId', advertiserId);
    return request<SpDepositBatch[]>(`/api/v1/deposit/batches?${params.toString()}`);
  },

  // Batch Approval / Rejection (Admin)
  approveBatch: (batchId: string, customCombination?: CombinationItem[]) =>
    request<{
      message: string;
      batch: SpDepositBatch;
      claims_count: number;
      claims: SpDepositClaim[];
    }>(`/api/v1/deposit/batches/${encodeURIComponent(batchId)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ combination: customCombination }),
    }),

  rejectBatch: (batchId: string, reason?: string) =>
    request<{
      message: string;
      batch: SpDepositBatch;
    }>(`/api/v1/deposit/batches/${encodeURIComponent(batchId)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Cards (Advertiser execution)
  getBatchCards: (batchId: string) =>
    request<{
      batch_id: string;
      status: string;
      requested_amount: number;
      method: PaymentMethod;
      cards: SpDepositClaim[];
    }>(`/api/v1/deposit/get-cards/${encodeURIComponent(batchId)}`),

  // Proofs & Matching
  submitProof: (claimId: string, proof_url: string, reference?: string, role: 'advertiser' | 'worker' = 'advertiser') =>
    request<{ message: string; claim: SpDepositClaim }>(
      `/api/v1/deposit/claims/${encodeURIComponent(claimId)}/proof`,
      {
        method: 'POST',
        body: JSON.stringify({ proof_url, reference, role }),
      },
    ),

  disputeClaim: (claimId: string, reason: string) =>
    request<{ message: string; claim: SpDepositClaim }>(
      `/api/v1/deposit/claims/${encodeURIComponent(claimId)}/dispute`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      },
    ),

  // P2P Transfers (v1.2.0)
  createTransfer: (params: {
    from_user_id: string;
    to: string;
    amount: number;
    method?: 'qr' | 'phone';
  }) =>
    request<{
      message: string;
      transfer: SpP2PTransfer;
      otp_code: string;
      recipient_name: string;
      sender_phone: string;
    }>('/api/v1/transfer', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  confirmTransfer: (params: { transfer_id: string; otp_code: string }) =>
    request<{
      message: string;
      transfer: SpP2PTransfer;
      sender_balance: number;
      recipient_balance: number;
    }>('/api/v1/transfer/confirm', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getTransfers: (userId?: string) => {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    return request<SpP2PTransfer[]>(`/api/v1/transfer?${params.toString()}`);
  },

  getQrPayload: (userId: string) =>
    request<{
      user_id: string;
      app: string;
      name: string;
      phone: string | null;
      kyc_status: string;
      qr_image_url: string;
    }>(`/api/v1/qr/${encodeURIComponent(userId)}`),

  getKycStatus: (userId: string) =>
    request<{
      user_id: string;
      name: string;
      kyc_status: 'verified' | 'unverified' | 'pending';
      app: string;
    }>(`/api/v1/kyc/${encodeURIComponent(userId)}`),

  updateKycStatus: (userId: string, kyc_status: 'verified' | 'unverified' | 'pending') =>
    request<{
      message: string;
      user_id: string;
      kyc_status: string;
    }>(`/api/v1/kyc/${encodeURIComponent(userId)}`, {
      method: 'POST',
      body: JSON.stringify({ kyc_status }),
    }),

  resetState: () => request<{ message: string }>('/api/v1/reset', { method: 'POST' }),
};

