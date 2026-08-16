import { NextResponse } from 'next/server';
import { sdeedpayDb } from '@/lib/sdeedpay-store';

export async function POST(
  request: Request,
  { params }: { params: { claimId: string } },
) {
  try {
    const claimId = params.claimId;
    const body = await request.json();
    const { proof_url, reference, role } = body;

    if (!proof_url) {
      return NextResponse.json({ message: 'proof_url is required' }, { status: 400 });
    }

    if (role === 'worker') {
      const claim = sdeedpayDb.submitWorkerProof(claimId, proof_url);
      return NextResponse.json({
        message: 'Worker proof submitted successfully.',
        claim,
      });
    } else {
      // Default: advertiser
      const claim = sdeedpayDb.submitAdvertiserProof(claimId, proof_url, reference);
      return NextResponse.json({
        message: 'Advertiser proof submitted. Status updated.',
        claim,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to submit proof' },
      { status: 400 },
    );
  }
}
