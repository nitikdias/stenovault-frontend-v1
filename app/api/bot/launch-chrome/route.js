import { spawn } from 'child_process';

export async function POST() {
  try {
    // Launch Chrome with remote debugging enabled
    // This uses the user's existing Chrome profile (already logged into Google)
    const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

    const chromeProcess = spawn(chromePath, [
      '--remote-debugging-port=9222',
      '--no-first-run',
      '--no-default-browser-check',
    ], {
      detached: true,
      stdio: 'ignore',
    });

    chromeProcess.unref();

    return Response.json({
      status: 'Chrome launched with remote debugging on port 9222',
      processId: chromeProcess.pid,
    });

  } catch (error) {
    console.error('[Bot] Error launching Chrome:', error);
    return Response.json({ error: 'Failed to launch Chrome' }, { status: 500 });
  }
}
