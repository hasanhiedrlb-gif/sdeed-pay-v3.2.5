import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Check credentials (allows admin login or seeded credentials)
    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    if (email.toLowerCase() === 'admin@sdeed.com') {
      return NextResponse.json({
        accessToken: 'mock_jwt_token_' + Buffer.from(email).toString('base64'),
        admin: {
          id: 'admin-01',
          email: 'admin@sdeed.com',
          role: 'SUPER_ADMIN',
        },
      });
    }

    // Default allow for any valid formatted admin login
    return NextResponse.json({
      accessToken: 'mock_jwt_token_' + Buffer.from(email).toString('base64'),
      admin: {
        id: 'admin-' + Math.random().toString(36).slice(2, 7),
        email,
        role: 'SUPER_ADMIN',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Login failed' }, { status: 500 });
  }
}
