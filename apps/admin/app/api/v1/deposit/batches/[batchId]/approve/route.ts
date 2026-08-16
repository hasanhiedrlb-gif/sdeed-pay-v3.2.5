import { NextResponse } from 'next/server';
import { sdeedpayDb } from '@/lib/sdeedpay-store';

export async function POST(
  request: Request,
  { params }: { params: { batchId: string } },
) {
  try {
    const batchId = params.batchId;
    let customCombination = undefined;

    try {
      const body = await request.json();
      if (body?.combination) {
        customCombination = body.combination;
      }
    } catch {
      // Empty body is okay (uses default AI suggested combination)
    }

    const result = sdeedpayDb.approveBatch(batchId, customCombination);

    return NextResponse.json({
      message: 'Batch approved successfully. Claims generated.',
      batch: result.batch,
      claims_count: result.claims.length,
      claims: result.claims,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to approve batch' },
      { status: 400 },
    );
  }
}
