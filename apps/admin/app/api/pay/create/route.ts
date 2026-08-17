import { NextResponse } from 'next/server';
import { assertPaymentEligibility, getKamekazKycStatus } from '@/lib/kamekaz-kyc';
import { SadeedDbService } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      merchant_id,
      merchantId,
      customer_user_id,
      customerUserId,
      payer_id,
      amount,
      order_id,
      orderId,
      description,
      metadata,
    } = body;

    const payer = customer_user_id || customerUserId || payer_id;
    const merchant = merchant_id || merchantId || 'usr_merchant_sdeed_beirut';
    const orderRef = order_id || orderId || `ORD-${Date.now()}`;
    const parsedAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);

    if (!payer) {
      return NextResponse.json(
        { success: false, message: 'customer_user_id (payer) is required' },
        { status: 400 },
      );
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Valid positive amount is required' },
        { status: 400 },
      );
    }

    // Step 1: Direct KYC check with Kamekaz (GET /api/v1/kyc/status)
    // If tier < C2, REJECT with "حسابك غير مؤهل للدفع"
    try {
      await assertPaymentEligibility(payer);
    } catch (kycErr: any) {
      return NextResponse.json(
        {
          success: false,
          error: kycErr.message || 'حسابك غير مؤهل للدفع',
          code: kycErr.code || 'KYC_TIER_INSUFFICIENT',
          current_tier: kycErr.currentTier,
          required_tier: 'C2',
          details: kycErr.details || 'مستوى التوثيق الحالي لا يسمح بالدفع الإلكتروني',
        },
        { status: 403 },
      );
    }

    // Step 2: Check Merchant KYC & Wallet
    const merchantKyc = await getKamekazKycStatus(merchant);

    // Step 3: Check & update DB Wallets & Process Transaction
    const result = await SadeedDbService.processPayment({
      payerUserId: payer,
      merchantUserId: merchant,
      amount: parsedAmount,
      orderId: orderRef,
      description: description || `Sadeed Pay Checkout Order #${orderRef}`,
      metadata: {
        ...metadata,
        payer_tier: (await getKamekazKycStatus(payer)).tier,
        merchant_tier: merchantKyc.tier,
        app: 'sadeed-pay-api',
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Payment created and processed successfully',
        payment: {
          payment_id: result.referenceId,
          reference_id: result.referenceId,
          order_id: orderRef,
          amount: parsedAmount,
          currency: result.payerWallet.currency,
          status: 'DONE',
          settled: true,
          payer: {
            user_id: payer,
            tier: result.payerWallet.tier,
            wallet_id: result.payerWallet.id,
            remaining_balance: result.payerWallet.balance,
          },
          merchant: {
            user_id: merchant,
            tier: result.merchantWallet.tier,
            wallet_id: result.merchantWallet.id,
            new_balance: result.merchantWallet.balance,
          },
          transaction_ids: {
            debit_tx: result.payerTx.id,
            credit_tx: result.merchantTx.id,
          },
          created_at: result.payerTx.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Payment processing failed',
        code: error?.code || 'PAYMENT_FAILED',
      },
      { status: error?.statusCode || 500 },
    );
  }
}
