import { NextResponse } from 'next/server';
import { sdeedpayDb } from '@/lib/sdeedpay-store';

export async function GET() {
  try {
    const users = sdeedpayDb.getUsers();
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Failed to get users' }, { status: 500 });
  }
}
