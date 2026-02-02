import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;

export async function POST(request) {
  try {
    const body = await request.json();

    console.log('Proxying new_encounter request to backend');

    const response = await fetch(`${API_BASE_URL}/new_encounter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "X-API-KEY": process.env.NEXT_PUBLIC_API_KEY || ""
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error proxying new_encounter to backend:', error);
    return NextResponse.json(
      { error: 'Failed to create encounter' },
      { status: 500 }
    );
  }
}
