// Kamekaz KYC Service Client & Verification Engine
// Rule: Sadeed Pay NEVER stores personal identity documents, only queries Kamekaz & stores the verified Tier.

export type KycTier = 'C0' | 'C1' | 'C2' | 'C3';

export interface KamekazKycResponse {
  user_id: string;
  name?: string;
  tier: KycTier;
  tier_level: number; // 0, 1, 2, 3
  is_verified: boolean;
  can_pay: boolean; // tier >= C2
  topup_limit: number | null; // C1 = 500, C2/C3 = null (unlimited), C0 = 0
  tier_label: string;
  kyc_status: 'verified' | 'unverified' | 'pending' | 'rejected';
}

// In-memory mock mapping for Kamekaz users with their corresponding KYC Tiers
const globalForKyc = globalThis as unknown as {
  kamekazKycTiers?: Record<string, KycTier>;
};

if (!globalForKyc.kamekazKycTiers) {
  globalForKyc.kamekazKycTiers = {
    // Verified C2 / C3 users (Eligible for payments & Unlimited topup)
    usr_merchant_sdeed_beirut: 'C3',
    adv_kamekaz_tech_01: 'C2',
    adv_kamekaz_brands_02: 'C2',
    usr_kamekaz_worker_01: 'C2',
    usr_kamekaz_worker_02: 'C2',
    admin_kamekaz_master: 'C3',
    usr_fleet_driver_01: 'C2',
    usr_fleet_driver_02: 'C2',

    // C1 Tier users (Basic verified: max $500 topup, NOT eligible for payments)
    usr_customer_96170123456: 'C1',
    usr_customer_96171987654: 'C1',
    usr_kamekaz_worker_03: 'C1',

    // C0 Tier users (Unverified: cannot pay, cannot topup)
    usr_kamekaz_worker_04: 'C0',
    usr_anonymous_unverified: 'C0',
  };
}

const tiersMap = globalForKyc.kamekazKycTiers;

export const TIER_CONFIG: Record<
  KycTier,
  {
    level: number;
    canPay: boolean;
    topupLimit: number | null; // null = unlimited
    label: string;
    labelAr: string;
    descriptionAr: string;
    badgeColor: string;
  }
> = {
  C0: {
    level: 0,
    canPay: false,
    topupLimit: 0,
    label: 'C0 - Unverified',
    labelAr: 'غير موثق (C0)',
    descriptionAr: 'حساب غير موثق. غير مؤهل للدفع أو الشحن.',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  C1: {
    level: 1,
    canPay: false,
    topupLimit: 500,
    label: 'C1 - Basic Verified',
    labelAr: 'موثق أساسي (C1 - سقف 500$)',
    descriptionAr: 'سقف الشحن 500$ كحد أقصى. غير مؤهل لإنشاء عمليات دفع للتجار.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  C2: {
    level: 2,
    canPay: true,
    topupLimit: null, // Unlimited
    label: 'C2 - Advanced Verified',
    labelAr: 'موثق متقدم (C2 - شحن غير محدود & دفع)',
    descriptionAr: 'مؤهل لعمليات الدفع والشحن غير المحدود.',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  C3: {
    level: 3,
    canPay: true,
    topupLimit: null, // Unlimited
    label: 'C3 - Merchant / VIP',
    labelAr: 'تاجر / VIP (C3 - شحن غير محدود & دفع فوري)',
    descriptionAr: 'مستوى التجار والشركات. شحن وتسوية فورية غير محدودة.',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
};

/**
 * Direct call to Kamekaz KYC API: GET /api/v1/kyc/status
 */
export async function getKamekazKycStatus(userId: string): Promise<KamekazKycResponse> {
  if (!userId) {
    throw new Error('user_id is required for Kamekaz KYC lookup');
  }

  // Look up tier from Kamekaz state
  const cleanId = userId.trim();
  const tier: KycTier = tiersMap[cleanId] || (cleanId.startsWith('adv_') || cleanId.includes('merchant') ? 'C2' : 'C1');
  const config = TIER_CONFIG[tier];

  return {
    user_id: cleanId,
    tier,
    tier_level: config.level,
    is_verified: tier !== 'C0',
    can_pay: config.canPay,
    topup_limit: config.topupLimit,
    tier_label: config.labelAr,
    kyc_status: tier === 'C0' ? 'unverified' : 'verified',
  };
}

/**
 * Set user tier in Kamekaz simulation (for test workbench)
 */
export function setKamekazUserTier(userId: string, tier: KycTier): KycTier {
  tiersMap[userId.trim()] = tier;
  return tier;
}

export function getAllKamekazTiers(): Record<string, KycTier> {
  return { ...tiersMap };
}

/**
 * Enforces KYC payment eligibility rule:
 * Must be tier >= C2. If tier < C2, throws Arabic error.
 */
export async function assertPaymentEligibility(userId: string): Promise<KamekazKycResponse> {
  const kyc = await getKamekazKycStatus(userId);
  if (!kyc.can_pay || kyc.tier_level < 2) {
    const error: any = new Error('حسابك غير مؤهل للدفع');
    error.statusCode = 403;
    error.code = 'KYC_TIER_INSUFFICIENT';
    error.currentTier = kyc.tier;
    error.requiredTier = 'C2';
    error.details = `المستوى الحالي للمستخدم (${kyc.tier}) أقل من C2 المطلوب لإنشاء عمليات الدفع`;
    throw error;
  }
  return kyc;
}

/**
 * Enforces Topup limit rule:
 * C0 = Cannot topup
 * C1 = Max 500 limit
 * C2/C3 = Unlimited
 */
export async function assertTopupLimit(userId: string, amount: number, currentBalance = 0): Promise<KamekazKycResponse> {
  const kyc = await getKamekazKycStatus(userId);

  if (kyc.tier === 'C0') {
    const error: any = new Error('حسابك غير موثق في كانكاز. يجب توثيق الهوية أولاً للشحن');
    error.statusCode = 403;
    error.code = 'KYC_UNVERIFIED';
    throw error;
  }

  if (kyc.tier === 'C1') {
    if (amount > 500) {
      const error: any = new Error(
        `سقف الشحن لمستوى C1 هو 500$ كحد أقصى للعملية الواحدة. المبلغ المطلوب ($${amount}) يتجاوز الحد المسموح. قم بترقية حسابك إلى C2 للشحن غير المحدود.`,
      );
      error.statusCode = 400;
      error.code = 'TOPUP_LIMIT_EXCEEDED';
      error.limit = 500;
      error.requested = amount;
      throw error;
    }
  }

  return kyc;
}
