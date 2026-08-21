import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';

export const GET: APIRoute = async () => {
  try {
    const bookings = await prisma.booking.findMany({
      include: { room: true, user: true },
      orderBy: { createdAt: 'desc' }
    });
    
    // Map to a simpler structure for the admin dashboard
    const formattedBookings = bookings.map(b => ({
      id: b.id,
      guestName: b.user?.name || 'Unknown Guest',
      room: b.room?.name || 'Unknown Room',
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

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Simple validation
    const checkIn = new Date(data.checkIn);
    const checkOut = new Date(data.checkOut);
    
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return new Response(JSON.stringify({ error: 'Invalid dates' }), { status: 400 });
    }
    
    if (checkOut <= checkIn) {
      return new Response(JSON.stringify({ error: 'Check-out must be after check-in' }), { status: 400 });
    }

    // Check for double booking
    const overlappingBookings = await prisma.booking.findMany({
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
      return new Response(JSON.stringify({ error: 'Room is not available for these dates' }), { status: 400 });
    }

    const booking = await prisma.booking.create({
      data: {
        checkInDate: checkIn,
        checkOutDate: checkOut,
        status: data.status || 'Pending',
        roomId: data.roomId,
        userId: data.userId, // We'll need a real user ID here in a complete system
      }
    });
    
    return new Response(JSON.stringify(booking), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Failed to create booking' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
