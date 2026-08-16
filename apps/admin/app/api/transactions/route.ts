import { NextResponse } from 'next/server';
import { transactionsStore } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const appSource = searchParams.get('appSource');
  const type = searchParams.get('type');
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');

  let results = [...transactionsStore];

  if (userId) {
    const q = userId.toLowerCase();
    results = results.filter(
      (t) =>
        t.fromUserId.toLowerCase().includes(q) ||
        t.toUserId.toLowerCase().includes(q),
    );
  }

  if (appSource) {
    const q = appSource.toLowerCase();
    results = results.filter((t) => t.appSource.toLowerCase().includes(q));
  }

  if (type) {
    results = results.filter((t) => t.type === type);
  }

  if (fromDate) {
    const from = new Date(fromDate).getTime();
    results = results.filter((t) => new Date(t.createdAt).getTime() >= from);
  }

  if (toDate) {
    const to = new Date(toDate).getTime() + 86400000; // include full day
    results = results.filter((t) => new Date(t.createdAt).getTime() <= to);
  }

  return NextResponse.json(results);
}
