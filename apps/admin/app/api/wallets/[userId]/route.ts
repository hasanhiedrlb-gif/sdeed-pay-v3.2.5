import { NextResponse } from 'next/server';
import { SadeedDbService } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: rawUserId } = await params;
    const userId = decodeURIComponent(rawUserId);

    let wallet = SadeedDbService.findWalletByUserId(userId);
    if (!wallet) {
      wallet = await SadeedDbService.getOrCreateWallet(userId);
    }

    return NextResponse.json({
      id: wallet.id,
      userId: wallet.userId,
      tier: wallet.tier,
      balance: wallet.balance,
      currency: wallet.currency,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to fetch wallet' },
      { status: 500 },
    );
  }
}
