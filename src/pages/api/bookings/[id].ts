import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return new Response(null, { status: 400 });

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { room: true, user: true }
    });
    if (!booking) return new Response(null, { status: 404 });
    return new Response(JSON.stringify(booking), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch booking' }), { status: 500 });
  }
}

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return new Response(null, { status: 400 });

  try {
    await prisma.booking.delete({
      where: { id }
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete booking' }), { status: 500 });
  }
}

export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params;
  if (!id) return new Response(null, { status: 400 });

  try {
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
