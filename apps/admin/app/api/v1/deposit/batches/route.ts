import { NextResponse } from 'next/server';
import { sdeedpayDb } from '@/lib/sdeedpay-store';
import { BatchStatus } from '@/lib/sdeedpay-types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as BatchStatus | undefined;
    const advertiserId = searchParams.get('advertiserId') || undefined;

    const batches = sdeedpayDb.getBatches({
      status: status || undefined,
      advertiserId,
    });

    return NextResponse.json(batches);
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Failed to get batches' }, { status: 500 });
  }
}
