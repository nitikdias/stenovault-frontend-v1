import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
const API_KEY = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || "";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const encounterId = searchParams.get('encounter_id');
    
    if (!userId || !encounterId) {
      return NextResponse.json(
        { error: 'user_id and encounter_id are required' },
        { status: 400 }
      );
    }
    
    const fullUrl = `${API_BASE_URL}/get-minutes?user_id=${userId}&encounter_id=${encounterId}`;
    
    console.log(`📋 Fetching saved minutes from: ${fullUrl}`);

    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id');
    
    const headers = {
      'X-API-KEY': API_KEY,
    };
    
    if (sessionId) {
      headers['Cookie'] = `session_id=${sessionId.value}`;
    }

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('❌ Error fetching minutes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch minutes' },
      { status: 500 }
    );
  }
}
