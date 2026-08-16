import { NextResponse } from 'next/server';
import { sdeedpayDb } from '@/lib/sdeedpay-store';

export async function POST() {
  try {
    const freshState = sdeedpayDb.resetToSeed();
    return NextResponse.json({
      message: 'State reset to initial seed successfully.',
      usersCount: freshState.users.length,
      withdrawalsCount: freshState.withdrawals.length,
      batchesCount: freshState.batches.length,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Failed to reset' }, { status: 500 });
  }
}
