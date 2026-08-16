import { NextResponse } from 'next/server';
import { sdeedpayDb } from '@/lib/sdeedpay-store';
import { PaymentMethod } from '@/lib/sdeedpay-types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const method = (searchParams.get('method') as PaymentMethod) || undefined;
    const colorTag = searchParams.get('colorTag') || undefined;

    const allInPool = sdeedpayDb.getWithdrawals({
      status: 'in_pool',
      method,
      colorTag,
    });

    const fullPool = sdeedpayDb.getWithdrawals({ status: 'in_pool' });

    // Aggregate statistics
    const stats = {
      totalLiquidity: fullPool.reduce((sum, r) => sum + r.amount, 0),
      totalCount: fullPool.length,
      greenCount: fullPool.filter((r) => r.color_tag === 'green').length, // 10
      blueCount: fullPool.filter((r) => r.color_tag === 'blue').length, // 20
      orangeCount: fullPool.filter((r) => r.color_tag === 'orange').length, // 30/40
      redCount: fullPool.filter((r) => r.color_tag === 'red').length, // 50+
      byMethod: {
        omt: fullPool.filter((r) => r.method === 'omt').reduce((sum, r) => sum + r.amount, 0),
        wish: fullPool.filter((r) => r.method === 'wish').reduce((sum, r) => sum + r.amount, 0),
        haram: fullPool.filter((r) => r.method === 'haram').reduce((sum, r) => sum + r.amount, 0),
        shamcash: fullPool.filter((r) => r.method === 'shamcash').reduce((sum, r) => sum + r.amount, 0),
      },
    };

    return NextResponse.json({
      stats,
      requests: allInPool,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Failed to get pool' }, { status: 500 });
  }
}
