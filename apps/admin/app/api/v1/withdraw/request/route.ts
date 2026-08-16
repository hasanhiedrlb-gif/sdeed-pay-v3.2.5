import { NextResponse } from 'next/server';
import { sdeedpayDb } from '@/lib/sdeedpay-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, amount, method, full_name, wallet_number, governorate, qr_code_url } = body;

    if (!user_id) {
      return NextResponse.json({ message: 'user_id is required' }, { status: 400 });
    }

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount < 10 || numAmount % 10 !== 0) {
      return NextResponse.json(
        { message: 'Withdrawal amount must be at least $10 and an exact multiple of 10 (e.g. 10, 20, 30, 50, 100).' },
        { status: 400 },
      );
    }

    if (!method || !['haram', 'omt', 'wish', 'shamcash'].includes(method)) {
      return NextResponse.json(
        { message: 'Valid method is required: haram, omt, wish, shamcash' },
        { status: 400 },
      );
    }

    const newReq = sdeedpayDb.createWithdrawal({
      userId: user_id,
      amount: numAmount,
      method,
      fullName: full_name,
      walletNumber: wallet_number,
      governorate,
      qrCodeUrl: qr_code_url,
    });

    return NextResponse.json(
      {
        message: 'Withdrawal request created successfully and placed in liquidity pool.',
        request: newReq,
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to create withdrawal request' },
      { status: 400 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const status = searchParams.get('status') || undefined;

    const list = sdeedpayDb.getWithdrawals({
      userId,
      status,
    });

    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Failed to get withdrawals' }, { status: 500 });
  }
}
