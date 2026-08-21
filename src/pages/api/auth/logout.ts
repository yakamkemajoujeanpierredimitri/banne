import type { APIRoute } from 'astro';
import { invalidateSession } from '../../../lib/auth';

export const POST: APIRoute = async (context) => {
  const sessionId = context.cookies.get('auth_session')?.value;
  if (sessionId) {
    await invalidateSession(sessionId);
    context.cookies.delete('auth_session', { path: '/' });
  }

  return context.redirect('/login');
};
