import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';

export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { id } = params;
  if (!id) return new Response(null, { status: 400 });

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { room: true, user: true }
    });
    if (!booking) return new Response(null, { status: 404 });
    if (booking.userId !== user.id && user.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    return new Response(JSON.stringify(booking), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch booking' }), { status: 500 });
  }
}

export const DELETE: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { id } = params;
  if (!id) return new Response(null, { status: 400 });

  try {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return new Response(null, { status: 404 });
    if (booking.userId !== user.id && user.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    await prisma.booking.delete({
      where: { id }
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete booking' }), { status: 500 });
  }
}

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { id } = params;
  if (!id) return new Response(null, { status: 400 });

  try {
    const bookingToUpdate = await prisma.booking.findUnique({ where: { id } });
    if (!bookingToUpdate) return new Response(null, { status: 404 });
    if (bookingToUpdate.userId !== user.id && user.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const data = await request.json();
    
    // Allow updating status, dates, etc.
    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.checkIn) updateData.checkInDate = new Date(data.checkIn);
    if (data.checkOut) updateData.checkOutDate = new Date(data.checkOut);
    if (data.roomId) updateData.roomId = data.roomId;
    
    const booking = await prisma.booking.update({
      where: { id },
      data: updateData
    });
    return new Response(JSON.stringify(booking), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update booking' }), { status: 500 });
  }
}
