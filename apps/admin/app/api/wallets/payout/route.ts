import { NextResponse } from 'next/server';
import { walletsStore, transactionsStore } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, amount, description } = body;

    const numAmount = parseFloat(amount);
    if (!userId || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { message: 'Valid userId and positive amount are required' },
        { status: 400 },
      );
    }

    const wallet = walletsStore.find((w) => w.userId.toLowerCase() === userId.toLowerCase());
    if (!wallet) {
      return NextResponse.json(
        { message: `Wallet not found for userId ${userId}` },
        { status: 404 },
      );
    }

    const currentBal = parseFloat(wallet.balance || '0');
    if (currentBal < numAmount) {
      return NextResponse.json(
        { message: 'Insufficient balance for payout' },
        { status: 400 },
      );
    }

    const newBal = (currentBal - numAmount).toFixed(2);
    wallet.balance = newBal;
    wallet.updatedAt = new Date().toISOString();

    const transaction = {
      id: 'tx-' + Math.random().toString(36).slice(2, 9),
      referenceId: `PAYOUT-${userId}-${Date.now()}`,
      fromUserId: userId,
      toUserId: 'SYSTEM',
      amount: numAmount.toFixed(2),
      type: 'PAYOUT' as const,
      appSource: 'sdeed-pay',
      description: description || 'Admin Payout',
      status: 'DONE' as const,
      createdAt: new Date().toISOString(),
    };

    transactionsStore.unshift(transaction);

    return NextResponse.json({
      wallet,
      transaction,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Payout processing failed' },
      { status: 500 },
    );
  }
}
