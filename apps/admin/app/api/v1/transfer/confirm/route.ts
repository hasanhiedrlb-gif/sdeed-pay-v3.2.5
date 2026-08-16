import { NextResponse } from 'next/server';
import { sdeedpayDb } from '@/lib/sdeedpay-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transfer_id, otp_code, otp } = body;

    const transferId = transfer_id;
    const finalOtp = otp_code || otp;

    if (!transferId) {
      return NextResponse.json({ message: 'transfer_id is required' }, { status: 400 });
    }
    if (!finalOtp) {
      return NextResponse.json({ message: 'otp_code is required' }, { status: 400 });
    }

    const result = sdeedpayDb.confirmP2PTransfer({
      transfer_id: transferId,
      otp: String(finalOtp),
    });

    return NextResponse.json(
      {
        message: 'P2P Transfer confirmed and completed successfully.',
        transfer: result.transfer,
        sender_balance: result.sender_balance,
        recipient_balance: result.recipient_balance,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to confirm P2P transfer' },
      { status: 400 },
    );
  }
}
