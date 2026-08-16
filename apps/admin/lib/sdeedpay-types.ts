export type PaymentMethod = 'haram' | 'omt' | 'wish' | 'shamcash';

export type KycStatus = 'verified' | 'unverified' | 'pending';

export type P2PTransferMethod = 'qr' | 'phone';

export type P2PTransferStatus = 'pending_otp' | 'completed' | 'cancelled';

export type WithdrawalStatus =
  | 'pending'
  | 'in_pool'
  | 'reserved'
  | 'claimed'
  | 'paid'
  | 'disputed';

export type ColorTag = 'green' | 'blue' | 'orange' | 'red';

export type BatchStatus =
  | 'pending_admin'
  | 'approved'
  | 'rejected'
  | 'completed';

export type ClaimStatus =
  | 'advertiser_sent'
  | 'worker_sent'
  | 'matched'
  | 'admin_review'
  | 'disputed';

export type UserRole = 'worker' | 'advertiser' | 'admin' | 'platform';

export interface SpUser {
  id: string; // Kamekaz user_id
  name: string;
  role: UserRole;
  points_balance: number; // 1 Point = 1 USD
  phone: string;
  wallet_number?: string;
  preferred_method?: PaymentMethod;
  kyc_status: KycStatus;
}

export interface SpP2PTransfer {
  id: string; // uuid PK
  from_user_id: string; // kamekaz user_id
  to_user_id: string; // kamekaz user_id
  to_phone?: string | null; // for phone transfer
  amount: number;
  method: P2PTransferMethod;
  status: P2PTransferStatus;
  otp_code: string; // for phone confirmation (6 digits)
  created_at: string;
  completed_at?: string | null;
  from_user_name?: string;
  to_user_name?: string;
  reference_id?: string;
}

export interface QrPayload {
  user_id: string;
  app: 'sdeedpay';
}

export interface SpWithdrawalRequest {
  id: string;
  user_id: string; // Kamekaz user_id
  amount: number; // Multiple of 10 (10, 20, 30, 40, 50, etc.)
  method: PaymentMethod;
  full_name?: string | null; // Required for haram/omt
  wallet_number: string;
  governorate: string;
  qr_code_url?: string | null;
  status: WithdrawalStatus;
  color_tag: ColorTag; // 'green'=10, 'blue'=20, 'orange'=30, 'red'=50+
  batch_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CombinationItem {
  amount: number;
  count: number;
  request_ids: string[];
}

export interface AlternativeCombination {
  id: string;
  title: string;
  strategy: 'smart_preservation' | 'fewest_transfers' | 'micro_balanced';
  combination: CombinationItem[];
  transfersCount: number;
  preservedBigBills: number;
  reasoning: string;
}

export interface SpDepositBatch {
  id: string;
  advertiser_id: string; // Kamekaz user_id
  requested_amount: number;
  method: PaymentMethod;
  status: BatchStatus;
  suggested_combination: CombinationItem[];
  admin_final_combination?: CombinationItem[] | null;
  alternatives?: AlternativeCombination[];
  ai_reasoning?: string[];
  rejection_reason?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface SpDepositClaim {
  id: string;
  batch_id: string;
  withdrawal_request_id: string;
  advertiser_id: string;
  worker_id: string;
  amount: number;
  method: PaymentMethod;
  // Card details shown to advertiser
  beneficiary_full_name?: string | null; // Shown if haram/omt, hidden/omitted if wish/shamcash
  wallet_number: string;
  governorate: string;
  qr_code_url?: string | null;
  advertiser_proof_url?: string | null;
  advertiser_reference?: string | null;
  advertiser_sent_at?: string | null;
  worker_proof_url?: string | null;
  worker_confirmed_at?: string | null;
  status: ClaimStatus;
  is_platform_commission?: boolean;
  dispute_reason?: string | null;
  created_at: string;
}

export const PLATFORM_USER_ID = 'usr_kamekaz_platform_treasury';

export function getColorTagForAmount(amount: number): ColorTag {
  if (amount <= 10) return 'green';
  if (amount === 20) return 'blue';
  if (amount === 30 || amount === 40) return 'orange';
  return 'red'; // 50+
}
