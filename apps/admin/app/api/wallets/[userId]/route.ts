import { NextResponse } from 'next/server';
import { walletsStore } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } },
) {
  const userId = decodeURIComponent(params.userId);
  const wallet = walletsStore.find((w) => w.userId.toLowerCase() === userId.toLowerCase());

  if (!wallet) {
    // If not found, create or return not found
    return NextResponse.json({ message: `Wallet not found for userId ${userId}` }, { status: 404 });
  }

  return NextResponse.json({
    id: wallet.id,
    userId: wallet.userId,
    balance: wallet.balance,
    currency: wallet.currency,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
  });
}
