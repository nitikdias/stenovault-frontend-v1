import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const CHATBOT_SERVICE_URL = 'http://127.0.0.1:8000';

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

    // If user_id is provided but no transcript, read the live transcript file
    if (body.user_id && !body.transcript) {
      const liveTranscriptPath = join(
        process.cwd(),
        '..',
        '..',
        'EMR-LITE-BACKEND',
        'segments',
        body.user_id,
        'live_transcript.txt'
      );
      
      console.log('📂 Attempting to read live transcript from:', liveTranscriptPath);

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

    console.log('📤 Sending to chatbot service:', {
      hasTranscript: !!finalPayload.transcript,
      transcriptLength: finalPayload.transcript?.length || 0
    });

    const response = await fetch(`${CHATBOT_SERVICE_URL}/ask`, {
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
