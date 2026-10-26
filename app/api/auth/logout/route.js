import { NextResponse } from 'next/server';
import {
  isSameOrigin,
  revokeSession,
  sessionTokenFromRequest,
  SESSION_COOKIE,
} from '../../../../lib/auth';

export async function POST(request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Permintaan lintas situs ditolak.' }, { status: 403 });
  }

  try {
    await revokeSession(sessionTokenFromRequest(request));
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Tidak dapat mengakhiri sesi.' }, { status: 503 });
  }
}
