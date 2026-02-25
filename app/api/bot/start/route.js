import { spawn } from 'child_process';
import path from 'path';

export async function POST(req) {
  try {
    const { meetingUrl, userId, meetingName, googleEmail } = await req.json();

    if (!meetingUrl || !userId) {
      return Response.json(
        { error: 'Missing required fields: meetingUrl and userId' },
        { status: 400 }
      );
    }

    // Go up from frontend/my-app to project root, then into bot/
    const botScriptPath = path.join(process.cwd(), '..', '..', 'bot', 'bot.js');

    const botProcess = spawn('node', [
      botScriptPath,
      meetingUrl,
      userId,
      meetingName || 'EMR-Lite Meeting',
      googleEmail || '',
    ], {
      detached: true,
      stdio: 'ignore',
    });

    botProcess.unref();

    console.log(`[Bot] Dispatched to: ${meetingUrl} | user: ${userId} | pid: ${botProcess.pid}`);

    return Response.json({
      status: "Bot dispatched to meeting!",
      meetingUrl,
      userId,
      processId: botProcess.pid,
    });

  } catch (error) {
    console.error('[Bot] Error starting bot:', error);
    return Response.json({ error: 'Failed to start bot process' }, { status: 500 });
  }
}
