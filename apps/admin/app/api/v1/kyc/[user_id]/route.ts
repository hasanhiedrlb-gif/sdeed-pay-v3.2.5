import { NextResponse } from 'next/server';
import {
  getKamekazKycStatus,
  setKamekazUserTier,
  KycTier,
} from '@/lib/kamekaz-kyc';
import { SadeedDbService } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ user_id: string }> },
) {
  try {
    const { user_id } = await params;
    const kyc = await getKamekazKycStatus(user_id);

    // Sync tier in DB wallet
    SadeedDbService.updateWalletTier(user_id, kyc.tier);

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
      { message: error?.message || 'Failed to fetch KYC status' },
      { status: error?.statusCode || 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ user_id: string }> },
) {
  try {
    const { user_id } = await params;
    const body = await request.json();
    const tier: KycTier = body.tier || (body.kyc_status === 'verified' ? 'C2' : 'C1');

    if (!['C0', 'C1', 'C2', 'C3'].includes(tier)) {
      return NextResponse.json(
        { message: 'Valid tier required: C0, C1, C2, C3' },
        { status: 400 },
      );
    }

    setKamekazUserTier(user_id, tier);
    SadeedDbService.updateWalletTier(user_id, tier);
    const kyc = await getKamekazKycStatus(user_id);

    return NextResponse.json({
      message: `KYC tier for ${user_id} updated to ${tier}`,
      kyc,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to update KYC status' },
      { status: 500 },
    );
  }
}
