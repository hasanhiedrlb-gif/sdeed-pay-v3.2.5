import { NextResponse } from 'next/server';
import { sdeedpayDb } from '@/lib/sdeedpay-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { from_user_id, to, amount, method } = body;

    if (!from_user_id) {
      return NextResponse.json({ message: 'from_user_id is required' }, { status: 400 });
    }
    if (!to) {
      return NextResponse.json({ message: 'to (recipient phone or user_id) is required' }, { status: 400 });
    }
    if (amount === undefined || amount === null) {
      return NextResponse.json({ message: 'amount is required' }, { status: 400 });
    }

    const result = sdeedpayDb.createP2PTransfer({
      from_user_id,
      to,
      amount: Number(amount),
      method: method || (to.startsWith('usr_') ? 'qr' : 'phone'),
    });

    return NextResponse.json(
      {
        message: result.message,
        transfer: result.transfer,
        otp_code: result.otp_code,
        recipient_name: result.recipient_name,
        sender_phone: result.sender_phone,
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to initiate P2P transfer' },
      { status: 400 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;

    const transfers = sdeedpayDb.getP2PTransfers(userId);
    return NextResponse.json(transfers);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to retrieve transfers' },
      { status: 500 },
    );
  }
}
