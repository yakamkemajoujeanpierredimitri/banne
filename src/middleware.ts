import { defineMiddleware } from 'astro:middleware';
import { validateSession } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const sessionId = context.cookies.get('auth_session')?.value;
  
  if (sessionId) {
    const { user, session } = await validateSession(sessionId);
    if (user && session) {
      context.locals.user = user;
      context.locals.session = session;
    } else {
      context.cookies.delete('auth_session', { path: '/' });
    }
  }

  // Route protection
  const path = context.url.pathname;
  const isProtectedRoute = path.startsWith('/dashboard');
  const isAdminRoute = path.startsWith('/admin') && !path.startsWith('/admin/verify');

  if ((isProtectedRoute || isAdminRoute) && !context.locals.user) {
    return context.redirect('/login');
  }

  if (isAdminRoute && context.locals.user?.role !== 'ADMIN') {
    return context.redirect('/dashboard');
  }

  return next();
});
