import { NextResponse } from 'next/server';
import {
  getKamekazKycStatus,
  setKamekazUserTier,
  getAllKamekazTiers,
  TIER_CONFIG,
  KycTier,
} from '@/lib/kamekaz-kyc';
import { SadeedDbService } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || searchParams.get('userId');

    if (!userId) {
      // If no specific user_id, return summary of all known tiers and configs
      return NextResponse.json({
        service: 'kamekaz-kyc-api',
        version: 'v1.0.0',
        tiers_config: TIER_CONFIG,
        active_users_tiers: getAllKamekazTiers(),
      });
    }

    const kyc = await getKamekazKycStatus(userId);

    // Sync tier in DB wallet if wallet exists
    SadeedDbService.updateWalletTier(userId, kyc.tier);

    return NextResponse.json({
      user_id: kyc.user_id,
      tier: kyc.tier,
      tier_level: kyc.tier_level,
      is_verified: kyc.is_verified,
      can_pay: kyc.can_pay,
      topup_limit: kyc.topup_limit,
      tier_label: kyc.tier_label,
      kyc_status: kyc.kyc_status,
      app: 'kamekaz',
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to query Kamekaz KYC' },
      { status: error?.statusCode || 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, tier } = body;

    if (!user_id || !tier) {
      return NextResponse.json(
        { message: 'user_id and tier (C0, C1, C2, C3) are required' },
        { status: 400 },
      );
    }

    if (!['C0', 'C1', 'C2', 'C3'].includes(tier)) {
      return NextResponse.json(
        { message: 'Invalid tier. Allowed values: C0, C1, C2, C3' },
        { status: 400 },
      );
    }

    const updatedTier = setKamekazUserTier(user_id, tier as KycTier);
    SadeedDbService.updateWalletTier(user_id, updatedTier);

    const kyc = await getKamekazKycStatus(user_id);

    return NextResponse.json({
      message: `KYC tier for ${user_id} updated to ${tier} in Kamekaz & DB`,
      kyc,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to update Kamekaz KYC tier' },
      { status: 500 },
    );
  }
}
