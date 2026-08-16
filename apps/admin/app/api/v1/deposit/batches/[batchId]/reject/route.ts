import { NextResponse } from 'next/server';
import { sdeedpayDb } from '@/lib/sdeedpay-store';

export async function POST(
  request: Request,
  { params }: { params: { batchId: string } },
) {
  try {
    const batchId = params.batchId;
    let reason = 'Rejected by admin';

    try {
      const body = await request.json();
      if (body?.reason) reason = body.reason;
    } catch {
      // ignore
    }

    const batch = sdeedpayDb.rejectBatch(batchId, reason);

    return NextResponse.json({
      message: 'Batch rejected. Withdrawal requests returned to pool.',
      batch,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to reject batch' },
      { status: 400 },
    );
  }
}
