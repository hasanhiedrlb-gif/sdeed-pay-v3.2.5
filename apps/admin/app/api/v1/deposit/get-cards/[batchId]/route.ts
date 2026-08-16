import { NextResponse } from 'next/server';
import { sdeedpayDb } from '@/lib/sdeedpay-store';

export async function POST(
  request: Request,
  { params }: { params: { batchId: string } },
) {
  try {
    const batchId = params.batchId;
    const result = sdeedpayDb.getBatchCards(batchId);

    return NextResponse.json({
      batch_id: result.batch.id,
      status: result.batch.status,
      requested_amount: result.batch.requested_amount,
      method: result.batch.method,
      cards: result.cards.map((c) => ({
        id: c.id,
        claim_id: c.id,
        withdrawal_request_id: c.withdrawal_request_id,
        amount: c.amount,
        method: c.method,
        // Privacy enforcement
        beneficiary_full_name:
          c.method === 'haram' || c.method === 'omt' ? c.beneficiary_full_name : null,
        wallet_number: c.wallet_number,
        governorate: c.governorate,
        qr_code_url: c.qr_code_url,
        advertiser_proof_url: c.advertiser_proof_url,
        advertiser_reference: c.advertiser_reference,
        worker_proof_url: c.worker_proof_url,
        status: c.status,
        is_platform_commission: c.is_platform_commission || false,
        created_at: c.created_at,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to get cards for batch' },
      { status: 400 },
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { batchId: string } },
) {
  return POST(request, { params });
}
