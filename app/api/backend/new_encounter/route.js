import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();

    console.log('Proxying new_encounter request to backend');

    const response = await fetch('http://localhost:8080/new_encounter', {
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
