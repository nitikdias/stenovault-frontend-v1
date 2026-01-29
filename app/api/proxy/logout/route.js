import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || '';

export async function POST(req) {
  try {
    // Get session_id from cookie
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id')?.value;

    if (sessionId) {
      // Forward logout to backend
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TOKEN_KEY || process.env.NEXT_PUBLIC_TOKEN_KEY}`,
          'Cookie': `session_id=${sessionId}`,
          "X-API-KEY": API_KEY
        },
      }).catch(err => console.error('Backend logout error:', err));
    }

    // Clear session cookie on frontend domain
    const response = NextResponse.json({ message: 'Logged out' }, { status: 200 });
    response.cookies.delete('session_id');

    return response;
  } catch (error) {
    console.error('Proxy logout error:', error);
    // Still clear cookie even on error
    const response = NextResponse.json({ message: 'Logged out' }, { status: 200 });
    response.cookies.delete('session_id');
    return response;
  }
}
