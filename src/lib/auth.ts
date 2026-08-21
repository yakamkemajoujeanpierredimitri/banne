import { prisma } from './prisma';
import crypto from 'crypto';

export async function createSession(userId: string) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

  const session = await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      expiresAt
    }
  });

  return session;
}

export async function validateSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true }
  });

  if (!session) return { user: null, session: null };

  if (Date.now() >= session.expiresAt.getTime()) {
    await prisma.session.delete({ where: { id: sessionId } });
    return { user: null, session: null };
  }

  // Extend session if close to expiring
  if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 3) {
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    await prisma.session.update({
      where: { id: sessionId },
      data: { expiresAt: session.expiresAt }
    });
  }

  return { user: session.user, session };
}

export async function invalidateSession(sessionId: string) {
  await prisma.session.delete({ where: { id: sessionId } });
}
