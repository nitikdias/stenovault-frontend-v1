import { execSync } from 'child_process';

export async function POST(req) {
  try {
    const { processId } = await req.json();

    if (!processId) {
      return Response.json({ error: 'Missing processId' }, { status: 400 });
    }

    try {
      // Kill the process and its children
      process.kill(processId, 'SIGKILL');
      console.log(`[Bot] Killed process ${processId}`);
    } catch (e) {
      // Process may have already exited — not a fatal error
      console.warn(`[Bot] Could not kill process ${processId}:`, e.message);
    }

    return Response.json({ status: 'Bot stopped', processId });

  } catch (error) {
    console.error('[Bot] Error stopping bot:', error);
    return Response.json({ error: 'Failed to stop bot' }, { status: 500 });
  }
}
