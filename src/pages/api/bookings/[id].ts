import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';
import { Prisma } from '@prisma/client';

export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 });

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { room: true, user: true }
    });
    if (!booking) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
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
  if (!id) return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 });

  try {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    if (booking.userId !== user.id && user.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    
    // Soft delete by marking as Cancelled
    await prisma.booking.update({
      where: { id },
      data: { status: 'Cancelled' }
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
  if (!id) return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 });

  try {
    const bookingToUpdate = await prisma.booking.findUnique({ where: { id } });
    if (!bookingToUpdate) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    if (bookingToUpdate.userId !== user.id && user.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    let data;
    try {
      data = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
    }
    
    const updateData: Prisma.BookingUpdateInput = {};
    
    if (data.status !== undefined) {
      const validStatuses = ['Pending', 'Paid', 'Cancelled', 'Pay_at_checkin'];
      if (!validStatuses.includes(data.status)) {
        return new Response(JSON.stringify({ error: 'Invalid status' }), { status: 400 });
      }
      updateData.status = data.status;
    }
    
    if (data.roomId) {
      updateData.room = { connect: { id: data.roomId } };
    }

    let checkIn = data.checkIn ? new Date(data.checkIn) : undefined;
    let checkOut = data.checkOut ? new Date(data.checkOut) : undefined;

    if (checkIn && isNaN(checkIn.getTime())) {
      return new Response(JSON.stringify({ error: 'Invalid check-in date' }), { status: 400 });
    }
    if (checkOut && isNaN(checkOut.getTime())) {
      return new Response(JSON.stringify({ error: 'Invalid check-out date' }), { status: 400 });
    }

    if (checkIn) updateData.checkInDate = checkIn;
    if (checkOut) updateData.checkOutDate = checkOut;

    // Check overlapping dates if dates or room change
    const targetRoomId = data.roomId || bookingToUpdate.roomId;
    const targetCheckIn = checkIn || bookingToUpdate.checkInDate;
    const targetCheckOut = checkOut || bookingToUpdate.checkOutDate;

    if (targetCheckOut <= targetCheckIn) {
      return new Response(JSON.stringify({ error: 'Check-out must be after check-in' }), { status: 400 });
    }

    if (data.checkIn || data.checkOut || data.roomId) {
      const overlappingBookings = await prisma.booking.findMany({
        where: {
          id: { not: id },
          roomId: targetRoomId,
          status: { not: 'Cancelled' },
          AND: [
            { checkInDate: { lt: targetCheckOut } },
            { checkOutDate: { gt: targetCheckIn } }
          ]
        }
      });

      if (overlappingBookings.length > 0) {
        return new Response(JSON.stringify({ error: 'Room is not available for these dates' }), { status: 400 });
      }
    }

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
