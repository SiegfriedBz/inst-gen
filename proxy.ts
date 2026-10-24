import { type NextRequest, NextResponse } from 'next/server';
import { decide } from '@/lib/pilot/gate';
import { getPilotConfig } from '@/lib/pilot/runtime-config';
import { SESSION_COOKIE } from '@/lib/pilot/session';
import messages from '@/messages/en.json';

export async function proxy(request: NextRequest) {
  const decision = await decide(
    request.nextUrl.pathname,
    request.cookies.get(SESSION_COOKIE)?.value,
    getPilotConfig(),
    new Date(),
  );

  switch (decision.kind) {
    case 'pass':
      return NextResponse.next();
    case 'redirect':
      return NextResponse.redirect(new URL(decision.to, request.url));
    case 'unauthorized':
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    case 'misconfigured':
      return new Response(
        `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Shopfront</title><p>${messages.notConfigured}</p></html>`,
        {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
        },
      );
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
