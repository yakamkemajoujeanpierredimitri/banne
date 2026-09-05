import type { APIRoute } from 'astro';
import { prisma } from '../../lib/prisma';
import Stripe from 'stripe';

const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

let stripe: Stripe | null = null;
if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20',
  });
}

export const POST: APIRoute = async ({ request, url, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    if (!stripe) {
      return new Response(JSON.stringify({ error: 'Stripe is not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    let data;
    try {
      data = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { bookingId } = data;

    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'Missing bookingId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { room: true },
    });

    if (!booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    if (booking.userId !== user.id && user.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    if (!booking.room) {
      return new Response(JSON.stringify({ error: 'Room not found for this booking' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (booking.status !== 'Pending') {
      return new Response(JSON.stringify({ error: `Cannot pay for booking with status ${booking.status}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid dates' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Stay at ${booking.room.name}`,
              description: `${nights} night(s) from ${checkIn.toISOString().split('T')[0]} to ${checkOut.toISOString().split('T')[0]}`,
            },
            unit_amount: Math.round(booking.room.price * 100),
          },
          quantity: nights,
        },
      ],
      mode: 'payment',
      success_url: `${url.origin}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${url.origin}/booking/cancel`,
      client_reference_id: booking.id,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
