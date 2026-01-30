import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

export async function POST(request) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization');
    
    const response = await fetch(`${API_BASE_URL}/update-meeting-name`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader || '',
        'X-API-KEY': API_KEY,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to update meeting name' },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error in update-meeting-name proxy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
