import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const whereClause = user.role === 'ADMIN' ? {} : { userId: user.id };

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: { room: true, user: true },
      orderBy: { createdAt: 'desc' }
    });
    
    // Map to a simpler structure for the admin dashboard
    const formattedBookings = bookings.map(b => ({
      id: b.id,
      guestName: b.guestName || b.user?.name || 'Unknown Guest',
      room: b.room?.name || 'Unknown Room',
      roomId: b.roomId,
      checkIn: b.checkInDate.toISOString().split('T')[0],
      checkOut: b.checkOutDate.toISOString().split('T')[0],
      status: b.status,
      // Rough total calculation based on room price and days
      total: Math.round(((b.checkOutDate.getTime() - b.checkInDate.getTime()) / (1000 * 3600 * 24)) * (b.room?.price || 0))
    }));

    return new Response(JSON.stringify(formattedBookings), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Failed to fetch bookings' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    let data;
    try {
      data = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
    }
    
    if (!data.roomId) {
      return new Response(JSON.stringify({ error: 'Missing roomId' }), { status: 400 });
    }

    // Simple validation
    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);
    
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return new Response(JSON.stringify({ error: 'Invalid dates' }), { status: 400 });
    }
    
    if (checkOut <= checkIn) {
      return new Response(JSON.stringify({ error: 'Check-out must be after check-in' }), { status: 400 });
    }

    const validStatuses = ['Pending', 'Paid', 'Cancelled', 'Pay_at_checkin'];
    const resolvedStatus = data.paymentOption === 'later' ? 'Pay_at_checkin' : (data.status || 'Pending');
    
    if (!validStatuses.includes(resolvedStatus)) {
      return new Response(JSON.stringify({ error: 'Invalid status' }), { status: 400 });
    }

    // Check for double booking using a transaction
    const booking = await prisma.$transaction(async (tx) => {
      const overlappingBookings = await tx.booking.findMany({
        where: {
          roomId: data.roomId,
          status: { not: 'Cancelled' },
          AND: [
            { checkInDate: { lt: checkOut } },
            { checkOutDate: { gt: checkIn } }
          ]
        }
      });

      if (overlappingBookings.length > 0) {
        throw new Error('Room is not available for these dates');
      }

      return await tx.booking.create({
        data: {
          checkInDate: checkIn,
          checkOutDate: checkOut,
          status: resolvedStatus,
          roomId: data.roomId,
          guestName: data.guestName || null,
          userId: user.id, // Use authenticated user
        }
      });
    });
    
    // Trigger confirmation email for pay-at-checkin bookings immediately
    if (data.paymentOption === 'later') {
      const { sendBookingConfirmation } = await import('../../../lib/email');
      try {
        await sendBookingConfirmation(booking.id);
      } catch (err) {
        console.error('Failed to send pay_at_checkin confirmation:', err);
      }
    }
    
    return new Response(JSON.stringify(booking), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error(error);
    if (error.message === 'Room is not available for these dates') {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ error: 'Failed to create booking' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
