import type { APIRoute } from 'astro';
import { invalidateSession } from '../../../lib/auth';

export const POST: APIRoute = async (context) => {
  const sessionId = context.cookies.get('auth_session')?.value;
  if (sessionId) {
    try {
      await invalidateSession(sessionId);
    } catch (e) {
      console.error('Failed to invalidate session:', e);
    }
    context.cookies.delete('auth_session', { path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
  }

  // Dashboard uses a standard form submission for logout, so we must redirect.
  return context.redirect('/login');
};
