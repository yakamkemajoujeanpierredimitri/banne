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

  // Handle i18n rewrites to avoid duplicating pages
  const locales = ['en', 'fr', 'nl'];
  const requestUrl = new URL(context.request.url);
  const reqParts = requestUrl.pathname.split('/');
  
  console.log(`data of requesturl : ${requestUrl.pathname}`);

  if (reqParts.length > 1 && locales.includes(reqParts[1])) {
      context.locals.lang = reqParts[1];
      console.log(`data of context locals lang : ${context.locals.lang}`);
  }

  const parts = context.url.pathname.split('/');
  if (parts.length > 1 && locales.includes(parts[1])) {
    const newPath = context.url.pathname.substring(parts[1].length + 1) || '/';
    if (!newPath.startsWith('/api/') && !newPath.startsWith('/admin/')) {
        return context.rewrite(newPath);
    }
  }

  return next();
});
