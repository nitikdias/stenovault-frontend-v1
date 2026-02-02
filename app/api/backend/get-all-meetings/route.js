import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://stenovault-core.eastus.azurecontainer.io:8000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const authHeader = request.headers.get('authorization');
    
    const response = await fetch(`${API_BASE_URL}/get-all-meetings?user_id=${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader || '',
        'X-API-KEY': API_KEY,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to fetch meetings' },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error in get-all-meetings proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
