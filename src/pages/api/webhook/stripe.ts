import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';
import Stripe from 'stripe';
import { sendBookingConfirmation } from '../../../lib/email';

const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

let stripe: Stripe | null = null;
if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey);
}

export const POST: APIRoute = async ({ request }) => {
  if (!stripe || !webhookSecret) {
    console.error('Stripe is not configured or missing webhook secret');
    return new Response('Server configuration error', { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  let event;

  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.client_reference_id;

    if (bookingId) {
      try {
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking) {
          console.warn(`Webhook received for unknown booking ${bookingId}`);
          return new Response('Booking not found', { status: 404 });
        }

        if (booking.status !== 'Paid') {
          await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'Paid' },
          });
          console.log(`Booking ${bookingId} marked as Paid`);
          
          // Send email in a separate try/catch so failures don't cause Stripe retries
          try {
            await sendBookingConfirmation(bookingId);
          } catch (err) {
            console.error(`Failed to send email for ${bookingId}:`, err);
          }
        } else {
          console.log(`Booking ${bookingId} is already paid. Ignoring retry.`);
        }
      } catch (err) {
        console.error(`Failed to update booking for ${bookingId}:`, err);
        return new Response('Failed to process booking completion', { status: 500 });
      }
    } else {
      console.warn('Checkout session completed without client_reference_id');
    }
  }

  return new Response(JSON.stringify({ received: true }), { 
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
