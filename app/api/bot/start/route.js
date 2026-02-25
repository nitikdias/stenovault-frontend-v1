export async function POST(req) {
  return Response.json(
    { error: 'Bot spawning is not supported in this deployment environment.' },
    { status: 501 }
  );
}
