import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

// Configure route to allow extra long-running LLM requests (10 minutes)
export const maxDuration = 600;
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const fullUrl = `${API_BASE_URL}/generate-minutes-from-file`;
    
    console.log(`📋 Proxying generate-minutes-from-file to: ${fullUrl}`);

    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id');
    
    const headers = {
      'X-API-KEY': API_KEY,
      'Connection': 'keep-alive',
    };
    
    if (sessionId) {
      headers['Cookie'] = `session_id=${sessionId.value}`;
    }

    // Get the request body (FormData or JSON)
    const contentType = request.headers.get('content-type');
    let body;
    
    if (contentType?.includes('application/json')) {
      // JSON body
      body = await request.text();
      headers['Content-Type'] = 'application/json';
    } else if (contentType?.includes('multipart/form-data')) {
      // FormData
      body = await request.formData();
    } else {
      // Fallback - try JSON
      body = await request.text();
      headers['Content-Type'] = 'application/json';
    }
    
    const fetchOptions = {
      method: 'POST',
      headers,
      credentials: 'include',
      body: body,
      // 10 minute timeout for LLM operations
      signal: AbortSignal.timeout(600000),
    };

    console.log('⏳ Starting LLM request (may take 30-120 seconds)...');
    const startTime = Date.now();
    
    const response = await fetch(fullUrl, fetchOptions);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ LLM request completed in ${elapsed}s`);

    // Handle Set-Cookie from backend
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const responseHeaders = new Headers();
      responseHeaders.append('Set-Cookie', setCookie);
      
      const data = await response.json();
      return NextResponse.json(data, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('❌ Error in generate-minutes-from-file proxy:', error);
    
    if (error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'LLM request timed out after 10 minutes' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Proxy error' },
      { status: 500 }
    );
  }
}
