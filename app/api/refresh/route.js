import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // ✅ Await cookies() - required in Next.js 15
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id');
    const TOKEN_KEY = process.env.TOKEN_KEY || process.env.NEXT_PUBLIC_TOKEN_KEY ;

    if (!sessionId) {
      console.error('❌ No session_id cookie found');
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    console.log('🔁 Forwarding refresh request to Flask backend with session_id:', sessionId.value);
    const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY ;

    // ✅ Forward request to Flask with the session_id cookie
    const response = await fetch(`https://infer.e2enetworks.net/project/p-8621/endpoint/is-7507/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN_KEY}`,
        'Cookie': `session_id=${sessionId.value}`, // ✅ Forward the cookie to backend
      },
      credentials: 'include', // ✅ Include credentials
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Flask refresh failed:', errorText);
      return NextResponse.json(
        { error: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const expiresIn = data.expires_in || 60;
    
    console.log('✅ Token refresh successful, expires in:', expiresIn, 'seconds');
    
    // ✅ Backend already sets the cookie with correct settings via Set-Cookie header
    // ✅ Just forward the response - don't recreate the cookie
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('💥 Refresh error:', error);
    return NextResponse.json(
      { error: 'Refresh failed' },
      { status: 500 }
    );
  }
}
