import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || '';

export async function POST(req) {
  try {
    // Get session_id from cookie
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id')?.value;

    if (!sessionId) {
      return NextResponse.json({ valid: false, error: 'No session cookie' }, { status: 401 });
    }

    // Forward to backend verify-session
    const res = await fetch(`${API_BASE_URL}/verify-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TOKEN_KEY || process.env.NEXT_PUBLIC_TOKEN_KEY}`,
      },
      body: JSON.stringify({ session_id: sessionId }),
    });

    const data = await res.json();

    // If session invalid, clear cookie
    if (!res.ok || !data.valid) {
      const response = NextResponse.json({ valid: false }, { status: 401 });
      response.cookies.delete('session_id');
      return response;
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Proxy verify-session error:', error);
    return NextResponse.json({ valid: false, error: 'Verification error' }, { status: 500 });
  }
}
