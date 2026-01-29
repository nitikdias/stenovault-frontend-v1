import { NextResponse } from 'next/server';

// API routes need server-side env vars (without NEXT_PUBLIC prefix)
const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
const TOKEN_KEY = process.env.TOKEN_KEY || process.env.NEXT_PUBLIC_TOKEN_KEY;

// Debug: Log env vars on module load (this shows in terminal)
console.log('🔧 Proxy Login Route Initialized:');
console.log('   API_BASE_URL:', API_BASE_URL);
console.log('   TOKEN_KEY:', TOKEN_KEY ? `Set (${TOKEN_KEY.length} chars)` : '❌ MISSING');

export async function POST(req) {
  try {
    const body = await req.json();

    console.log('🔄 Proxy: Forwarding login request to backend:', API_BASE_URL);
    console.log('📧 Email:', body.email);
    console.log('🔐 Password received:', body.password ? `Yes (length: ${body.password.length})` : 'No - MISSING!');
    console.log('📦 Full body keys:', Object.keys(body));
    console.log('🔑 TOKEN_KEY available:', TOKEN_KEY ? 'Yes (length: ' + TOKEN_KEY.length + ')' : 'No - MISSING!');
    
    if (!TOKEN_KEY) {
      console.error('❌ TOKEN_KEY is not set in environment variables!');
      return NextResponse.json({ error: 'Server configuration error: TOKEN_KEY missing' }, { status: 500 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN_KEY}`,
      "X-API-KEY": process.env.NEXT_PUBLIC_API_KEY || ""
    };
    
    console.log('📋 Request headers:', { ...headers, Authorization: 'Bearer ***' + TOKEN_KEY.slice(-20) });

    // Forward login request to backend
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data;
    
    console.log('📥 Backend response status:', res.status);
    console.log('📥 Backend response body (first 200 chars):', text.substring(0, 200));
    
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('❌ Failed to parse backend response:', text);
      return NextResponse.json({ error: 'Invalid response from backend' }, { status: 502 });
    }

    if (!res.ok) {
      console.error('❌ Backend login failed with status', res.status, ':', data);
      return NextResponse.json(data, { status: res.status });
    }

    // Create response
    const response = NextResponse.json(data, { status: res.status });

    // If login successful and backend returned session_id, set cookie on frontend domain
    if (data.session_id) {
      const expiresIn = data.expires_in || 300;
      
      response.cookies.set('session_id', data.session_id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: expiresIn,
      });

      console.log(`✅ Set session_id cookie for user_id=${data.user_id}, expires in ${expiresIn}s`);
    }

    return response;
  } catch (error) {
    console.error('❌ Proxy login error:', error);
    return NextResponse.json({ error: 'Login proxy error', details: error.message }, { status: 500 });
  }
}
