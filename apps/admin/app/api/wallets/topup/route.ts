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

    let wallet = walletsStore.find((w) => w.userId.toLowerCase() === userId.toLowerCase());
    if (!wallet) {
      // Auto-create wallet if it does not exist yet
      wallet = {
        id: 'w-' + Math.random().toString(36).slice(2, 9),
        userId,
        balance: '0.00',
        currency: 'LBP',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      walletsStore.push(wallet);
    }

    const currentBal = parseFloat(wallet.balance || '0');
    const newBal = (currentBal + numAmount).toFixed(2);
    wallet.balance = newBal;
    wallet.updatedAt = new Date().toISOString();

    const transaction = {
      id: 'tx-' + Math.random().toString(36).slice(2, 9),
      referenceId: `TOPUP-${userId}-${Date.now()}`,
      fromUserId: 'SYSTEM',
      toUserId: userId,
      amount: numAmount.toFixed(2),
      type: 'TOPUP' as const,
      appSource: 'sdeed-pay',
      description: description || 'Admin Topup',
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
      { message: error?.message || 'Topup processing failed' },
      { status: 500 },
    );
  }
}
