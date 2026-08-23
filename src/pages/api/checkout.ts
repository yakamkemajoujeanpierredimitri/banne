import type { APIRoute } from 'astro';
import { prisma } from '../../lib/prisma';
import Stripe from 'stripe';

// Use standard Node.js process.env for standard API routes running in Node adapter
const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || '';

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20', // Use a recent valid API version
});

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const { bookingId } = await request.json();

    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'Missing bookingId' }), { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { room: true },
    });

    if (!booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 });
    }

    // Calculate number of nights
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid dates' }), { status: 400 });
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
            unit_amount: Math.round(booking.room.price * 100), // unit_amount is in cents
          },
          quantity: nights,
        },
      ],
      mode: 'payment',
      success_url: `${url.origin}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${url.origin}/booking/cancel`,
      client_reference_id: booking.id, // Store booking ID for the webhook
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
