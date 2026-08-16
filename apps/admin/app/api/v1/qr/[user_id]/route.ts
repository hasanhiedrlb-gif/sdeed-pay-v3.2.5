import { NextResponse } from 'next/server';
import { sdeedpayDb } from '@/lib/sdeedpay-store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ user_id: string }> },
) {
  try {
    const { user_id } = await params;

    if (!user_id) {
      return NextResponse.json({ message: 'user_id is required' }, { status: 400 });
    }

    const user = sdeedpayDb.getUser(user_id);
    const kycStatus = sdeedpayDb.getKycStatus(user_id);

    const qrData = {
      user_id,
      app: 'sdeedpay',
      name: user ? user.name : user_id,
      phone: user?.phone || null,
      kyc_status: kycStatus,
      qr_image_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        JSON.stringify({ user_id, app: 'sdeedpay' }),
      )}`,
    };

    return NextResponse.json(qrData);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to generate QR payload' },
      { status: 500 },
    );
  }
}
