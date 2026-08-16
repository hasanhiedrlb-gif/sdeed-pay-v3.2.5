import { NextResponse } from 'next/server';
import { sdeedpayDb } from '@/lib/sdeedpay-store';

export async function POST(
  request: Request,
  { params }: { params: { claimId: string } },
) {
  try {
    const claimId = params.claimId;
    const body = await request.json();
    const { reason } = body;

    const claim = sdeedpayDb.disputeClaim(claimId, reason || 'Payment disputed by user');
    return NextResponse.json({
      message: 'Claim flagged for Admin Review / Dispute.',
      claim,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to dispute claim' },
      { status: 400 },
    );
  }
}
