import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  console.log('\n========== /api/refresh ROUTE CALLED ==========');
  console.log(`Time: ${new Date().toLocaleTimeString()}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    // ✅ Await cookies() - required in Next.js 15
    const cookieStore = await cookies();
    console.log('📦 Cookie store retrieved');
    
    const sessionId = cookieStore.get('session_id');
    console.log('🔍 Looking for session_id cookie...');
    console.log('   Found:', sessionId ? `Yes (${sessionId.value.substring(0, 20)}...)` : 'No');
    
    const TOKEN_KEY = process.env.TOKEN_KEY || process.env.NEXT_PUBLIC_TOKEN_KEY;
    console.log('🔑 TOKEN_KEY:', TOKEN_KEY ? 'Set' : 'Missing');

    if (!sessionId) {
      console.error('❌ No session_id cookie found');
      console.log('==========================================\n');
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    console.log('🔁 Forwarding refresh request to Flask backend');
    console.log(`   Backend URL: http://localhost:8080/refresh`);
    console.log(`   Session ID: ${sessionId.value.substring(0, 20)}...`);

    // ✅ Forward request to Flask backend at localhost:8080
    const backendResponse = await fetch(`http://localhost:8080/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN_KEY}`,
        'X-Session-ID': sessionId.value,
        'Cookie': `session_id=${sessionId.value}`,
        "X-API-KEY": process.env.NEXT_PUBLIC_API_KEY || ""
      },
      credentials: 'include',
    });
    
    console.log('📥 Backend response received:');
    console.log(`   Status: ${backendResponse.status} ${backendResponse.statusText}`);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('❌ Flask refresh failed:', errorText);
      console.log('==========================================\n');
      return NextResponse.json(
        { error: errorText },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    const expiresIn = data.expires_in || 60;
    
    console.log('✅ Token refresh successful');
    console.log(`   Expires in: ${expiresIn} seconds`);
    
    // ✅ Forward the Set-Cookie header from backend to client
    const backendSetCookie = backendResponse.headers.get('set-cookie');
    console.log('🍪 Set-Cookie header from backend:', backendSetCookie ? 'Present' : 'Missing');
    
    const nextResponse = NextResponse.json(data);
    
    if (backendSetCookie) {
      console.log('📦 Forwarding Set-Cookie header to client');
      nextResponse.headers.set('Set-Cookie', backendSetCookie);
    } else {
      console.warn('⚠️ Backend did not send Set-Cookie, creating manually');
      nextResponse.cookies.set('session_id', sessionId.value, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: expiresIn
      });
    }
    
    nextResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    
    console.log('✅ Response prepared and sent to client');
    console.log('==========================================\n');
    
    return nextResponse;
    
  } catch (error) {
    console.error('💥 Refresh error:', error);
    console.error('   Stack:', error.stack);
    console.log('==========================================\n');
    return NextResponse.json(
      { error: 'Refresh failed' },
      { status: 500 }
    );
  }
}
