export async function GET() {
  try {
    // Try to reach Chrome's remote debugging JSON endpoint
    const res = await fetch('http://127.0.0.1:9222/json/version', {
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      const data = await res.json();
      return Response.json({ ready: true, browser: data.Browser });
    }

    return Response.json({ ready: false });
  } catch {
    return Response.json({ ready: false });
  }
}
