export function GET() {
  return Response.json({ collab: process.env.COLLAB_URL || null }, { headers: { 'Cache-Control': 'no-store' } });
}
