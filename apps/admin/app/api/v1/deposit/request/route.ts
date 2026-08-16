import { NextResponse } from 'next/server';
import { sdeedpayDb } from '@/lib/sdeedpay-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { advertiser_id, amount, method } = body;

    if (!advertiser_id) {
      return NextResponse.json({ message: 'advertiser_id is required' }, { status: 400 });
    }

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount < 10 || numAmount % 10 !== 0) {
      return NextResponse.json(
        { message: 'Amount must be at least 10 and a multiple of 10 (e.g. 10, 20, 30, 50, 100).' },
        { status: 400 },
      );
    }

    if (!method || !['haram', 'omt', 'wish', 'shamcash'].includes(method)) {
      return NextResponse.json(
        { message: 'Valid method is required: haram, omt, wish, shamcash' },
        { status: 400 },
      );
    }

    const result = sdeedpayDb.createDepositRequest({
      advertiserId: advertiser_id,
      amount: numAmount,
      method,
    });

    return NextResponse.json(
      {
        batch_id: result.batch_id,
        status: 'pending_admin',
        requested_amount: numAmount,
        method,
        suggestion: result.suggestion,
        alternatives: result.alternatives,
        ai_reasoning: result.ai_reasoning,
        exactMatchFound: result.exactMatchFound,
        message: 'Deposit request created. Waiting for Admin Approval.',
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to create deposit request' },
      { status: 400 },
    );
  }
}
