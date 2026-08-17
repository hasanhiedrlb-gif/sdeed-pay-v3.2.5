import { NextResponse } from 'next/server';
import { transactionsStore, walletsStore, SadeedDbService } from '@/lib/db';
import { getKamekazKycStatus } from '@/lib/kamekaz-kyc';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference_id, referenceId, payment_id, paymentId, merchant_id } = body;

    const queryRef = reference_id || referenceId || payment_id || paymentId;

    if (!queryRef) {
      return NextResponse.json(
        { success: false, message: 'reference_id or payment_id is required' },
        { status: 400 },
      );
    }

    // Lookup transaction in DB ledger
    const cleanRef = String(queryRef).trim();
    const matchedTx = transactionsStore.find(
      (tx) =>
        tx.referenceId === cleanRef ||
        tx.referenceId.startsWith(cleanRef) ||
        tx.id === cleanRef ||
        (typeof tx.metadata === 'object' && tx.metadata?.referenceId === cleanRef),
    );

    if (!matchedTx) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          message: `No transaction found for reference: ${queryRef}`,
        },
        { status: 404 },
      );
    }

    // Lookup wallet in DB
    const wallet = SadeedDbService.findWalletById(matchedTx.walletId);
    const kyc = await getKamekazKycStatus(matchedTx.fromUserId);

    return NextResponse.json({
      success: true,
      verified: true,
      payment: {
        id: matchedTx.id,
        reference_id: matchedTx.referenceId,
        amount: parseFloat(matchedTx.amount),
        currency: wallet?.currency || 'USD',
        type: matchedTx.type,
        status: matchedTx.status,
        from_user_id: matchedTx.fromUserId,
        to_user_id: matchedTx.toUserId,
        wallet_id: matchedTx.walletId,
        wallet_current_balance: wallet?.balance || '0.00',
        wallet_tier: wallet?.tier || kyc.tier,
        app_source: matchedTx.appSource,
        description: matchedTx.description,
        metadata: matchedTx.metadata,
        created_at: matchedTx.createdAt,
      },
      kamekaz_kyc: {
        user_id: kyc.user_id,
        tier: kyc.tier,
        can_pay: kyc.can_pay,
        is_verified: kyc.is_verified,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to verify payment',
      },
      { status: 500 },
    );
  }
}
