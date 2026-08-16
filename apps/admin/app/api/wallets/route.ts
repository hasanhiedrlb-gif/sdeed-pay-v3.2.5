import { NextResponse } from 'next/server';
import { walletsStore } from '@/lib/db';

export async function GET() {
  return NextResponse.json(walletsStore);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ message: 'userId is required' }, { status: 400 });
    }

    const existing = walletsStore.find((w) => w.userId.toLowerCase() === userId.toLowerCase());
    if (existing) {
      return NextResponse.json(
        { message: `Wallet already exists for userId ${userId}` },
        { status: 409 },
      );
    }

    const newWallet = {
      id: 'w-' + Math.random().toString(36).slice(2, 9),
      userId,
      balance: '0.00',
      currency: 'LBP',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    walletsStore.unshift(newWallet);
    return NextResponse.json(newWallet, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Failed to create wallet' }, { status: 500 });
  }
}
