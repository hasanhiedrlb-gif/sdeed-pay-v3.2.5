import { NextResponse } from 'next/server';
import { assertTopupLimit, getKamekazKycStatus } from '@/lib/kamekaz-kyc';
import { SadeedDbService } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, userId, amount, channel, description } = body;

    const targetUser = user_id || userId;
    const parsedAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: 'user_id is required' },
        { status: 400 },
      );
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Valid positive amount is required' },
        { status: 400 },
      );
    }

    // Step 1: Query Kamekaz KYC API & enforce tier limits
    // C0 = Unverified (Reject)
    // C1 = Cap of 500 (Reject if amount > 500)
    // C2/C3 = Unlimited
    let kyc;
    try {
      kyc = await assertTopupLimit(targetUser, parsedAmount);
    } catch (limitErr: any) {
      return NextResponse.json(
        {
          success: false,
          error: limitErr.message || 'Topup limit exceeded for current KYC tier',
          code: limitErr.code || 'KYC_LIMIT_ERROR',
          tier: limitErr.code === 'KYC_UNVERIFIED' ? 'C0' : 'C1',
          allowed_limit: limitErr.limit || 0,
          requested_amount: parsedAmount,
          hint: 'قم بترقية حسابك إلى C2 للحصول على شحن غير محدود',
        },
        { status: limitErr.statusCode || 400 },
      );
    }

    // Step 2: Update Wallet in DB & Log new Transaction
    const result = await SadeedDbService.topupWallet({
      userId: targetUser,
      amount: parsedAmount,
      channel: channel || 'api_topup',
      description: description || `Wallet Topup of $${parsedAmount.toFixed(2)} USD`,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Wallet for ${targetUser} successfully topped up with $${parsedAmount.toFixed(2)}`,
        wallet: {
          id: result.wallet.id,
          user_id: result.wallet.userId,
          tier: result.wallet.tier,
          balance: result.wallet.balance,
          currency: result.wallet.currency,
          tier_benefits:
            result.wallet.tier === 'C1'
              ? 'سقف الشحن 500$ للعملية'
              : 'شحن غير محدود ومؤهل للدفع',
        },
        transaction: {
          id: result.transaction.id,
          reference_id: result.transaction.referenceId,
          amount: parseFloat(result.transaction.amount),
          status: result.transaction.status,
          type: result.transaction.type,
          created_at: result.transaction.createdAt,
        },
        kamekaz_kyc: {
          tier: kyc.tier,
          is_verified: kyc.is_verified,
          can_pay: kyc.can_pay,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to process topup',
      },
      { status: error?.statusCode || 500 },
    );
  }
}
