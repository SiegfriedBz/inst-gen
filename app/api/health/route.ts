// Reached only with a valid session: proxy.ts answers 401 otherwise.
export function GET() {
  return Response.json({ ok: true });
}
