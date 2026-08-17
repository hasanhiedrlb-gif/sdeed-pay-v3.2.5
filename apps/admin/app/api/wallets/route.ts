import { NextResponse } from 'next/server';
import { walletsStore, SadeedDbService } from '@/lib/db';

export async function GET() {
  return NextResponse.json(walletsStore);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, initialBalance = '0.00', currency = 'USD' } = body;

    if (!userId) {
      return NextResponse.json({ message: 'userId is required' }, { status: 400 });
    }

    const existing = SadeedDbService.findWalletByUserId(userId);
    if (existing) {
      return NextResponse.json(
        { message: `Wallet already exists for userId ${userId}`, wallet: existing },
        { status: 409 },
      );
    }

    const newWallet = await SadeedDbService.getOrCreateWallet(userId, initialBalance, currency);
    return NextResponse.json(newWallet, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to create wallet' },
      { status: 500 },
    );
  }
}
