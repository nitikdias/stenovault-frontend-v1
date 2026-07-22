import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const CHATBOT_SERVICE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000';

export async function POST(request) {
  try {
    const body = await request.json();

    console.log('🤖 Chatbot proxy received:', {
      hasTranscript: !!body.transcript,
      hasUserId: !!body.user_id,
      transcriptLength: body.transcript?.length || 0,
      userId: body.user_id,
      question: body.question,
      bodyKeys: Object.keys(body)
    });

    let finalPayload = { ...body };

    // Only read the live transcript file if the request explicitly says it's a live session.
    // This prevents stale leftover live_transcript.txt files from overriding the
    // /ask/user endpoint which fetches the last 5 meetings from the DB.
    if (body.user_id && !body.transcript && body.mode === 'live') {
      const liveTranscriptPath = join(
        process.cwd(),
        '..',
        '..',
        'EMR-LITE-BACKEND',
        'segments',
        body.user_id,
        'live_transcript.txt'
      );

      console.log('📂 Live mode — reading live transcript from:', liveTranscriptPath);

      if (existsSync(liveTranscriptPath)) {
        try {
          const liveTranscript = await readFile(liveTranscriptPath, 'utf-8');

          if (liveTranscript.trim()) {
            console.log('✅ Live transcript loaded:', {
              length: liveTranscript.length,
              preview: liveTranscript.substring(0, 150)
            });
            finalPayload = {
              question: body.question,
              transcript: liveTranscript
            };
          } else {
            console.log('⚠️ Live transcript file is empty');
          }
        } catch (readError) {
          console.error('❌ Error reading live transcript:', readError);
        }
      } else {
        console.log('⚠️ Live transcript file not found:', liveTranscriptPath);
      }
    }

    // Determine which backend endpoint to use:
    // - If user_id is provided (standalone chatbot or live mode without live transcript),
    //   use /ask/user which fetches the last 5 meetings from the DB
    // - If transcript is provided (viewing a saved meeting), use /ask with the transcript
    let backendEndpoint = `${CHATBOT_SERVICE_URL}/ask`;

    if (finalPayload.user_id && !finalPayload.transcript) {
      // Route to /ask/user — fetches last 5 meetings from DB
      backendEndpoint = `${CHATBOT_SERVICE_URL}/ask/user`;
      console.log('🔀 Routing to /ask/user (fetching last 5 meetings from DB)');
    } else {
      console.log('🔀 Routing to /ask (using provided transcript)');
    }

    const response = await fetch(backendEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(finalPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Chatbot service error:', data);
      return NextResponse.json(
        { error: data.detail || data.error || 'Chatbot service error' },
        { status: response.status }
      );
    }

    console.log('✅ Chatbot response received');
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Chatbot proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to chatbot service' },
      { status: 500 }
    );
  }
}
