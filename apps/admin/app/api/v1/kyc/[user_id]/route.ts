import { NextResponse } from 'next/server';
import { sdeedpayDb } from '@/lib/sdeedpay-store';

const KAMEKAZ_API_URL =
  process.env.NEXT_PUBLIC_KAMEKAZ_API || 'https://kamekaz-v3-2-5.vercel.app';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ user_id: string }> },
) {
  try {
    const { user_id } = await params;
    const kyc_status = sdeedpayDb.getKycStatus(user_id);
    const user = sdeedpayDb.getUser(user_id);

    return NextResponse.json({
      user_id,
      name: user?.name || user_id,
      kyc_status,
      app: 'kamekaz',
      kamekaz_api: KAMEKAZ_API_URL,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to fetch KYC status' },
      { status: 500 },
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
    const { kyc_status } = body;

    if (!kyc_status || !['verified', 'pending', 'unverified', 'rejected'].includes(kyc_status)) {
      return NextResponse.json(
        { message: 'Valid kyc_status required: verified, pending, unverified, rejected' },
        { status: 400 },
      );
    }

    sdeedpayDb.setKycStatus(user_id, kyc_status);

    return NextResponse.json({
      message: `KYC status for ${user_id} updated to ${kyc_status}`,
      user_id,
      kyc_status,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to update KYC status' },
      { status: 500 },
    );
  }
}
