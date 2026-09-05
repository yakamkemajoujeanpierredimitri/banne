import { Resend } from 'resend';
import { prisma } from './prisma';

const resendApiKey = import.meta.env.RESEND_API_KEY ;

// Lazy-initialize Resend client only when needed
let _resend: Resend | null = null;
function getResendClient(): Resend | null {
  if (!resendApiKey) return null;
  if (!_resend) _resend = new Resend(resendApiKey);
  return _resend;
}

/**
 * Escape HTML special characters to prevent injection in email templates.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendBookingConfirmation(bookingId: string) {
  const resend = getResendClient();
  if (!resend) {
    console.warn('RESEND_API_KEY not configured, skipping email.');
    return;
  }

  // Fetch full booking details
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: true, user: true },
  });

  if (!booking) {
    throw new Error('Booking not found for email confirmation');
  }

  if (!booking.room) {
    console.error(`Room not found for booking ${bookingId}, skipping email.`);
    return;
  }

  const checkIn = booking.checkInDate.toISOString().split('T')[0];
  const checkOut = booking.checkOutDate.toISOString().split('T')[0];
  const guestName = escapeHtml(booking.user?.name || 'Valued Guest');
  const guestEmail = booking.user?.email;
  const roomName = escapeHtml(booking.room.name);
  
  const hotelAdminEmail = import.meta.env.HOTEL_ADMIN_EMAIL;
  if (!hotelAdminEmail) {
    console.warn('HOTEL_ADMIN_EMAIL not configured, skipping admin notification.');
  }

  // Note: For Resend free tier, 'from' must be a verified domain.
  // 'onboarding@resend.dev' works for testing on free tier
  const fromEmail = 'Albergobanne Hotel <onboarding@resend.dev>';

  if (!guestEmail) {
      console.warn('No guest email found, skipping guest confirmation email');
  } else {
      // Send Email to Guest
      const guestMessage = booking.status === 'Paid' 
        ? 'Your booking has been confirmed and paid successfully.'
        : 'Your booking has been confirmed. Payment will be collected upon check-in.';

      try {
        await resend.emails.send({
          from: fromEmail,
          to: guestEmail,
          subject: `Booking Confirmed - ${roomName}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h1 style="color: #c4a47c;">Booking Confirmation</h1>
                <p>Dear ${guestName},</p>
                <p>Thank you for choosing Albergobanne Hotel. ${guestMessage}</p>
                
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h2 style="margin-top: 0; font-size: 1.2rem;">Booking Details</h2>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        <li style="margin-bottom: 10px;"><strong>Booking ID:</strong> ${booking.id}</li>
                        <li style="margin-bottom: 10px;"><strong>Room:</strong> ${roomName}</li>
                        <li style="margin-bottom: 10px;"><strong>Check-in:</strong> ${checkIn}</li>
                        <li style="margin-bottom: 10px;"><strong>Check-out:</strong> ${checkOut}</li>
                        <li style="margin-bottom: 10px;"><strong>Status:</strong> ${booking.status}</li>
                    </ul>
                </div>
                
                <p>We look forward to welcoming you!</p>
                <p>Best regards,<br>The Albergobanne Team</p>
            </div>
          `,
        });
      } catch (err) {
          console.error("Failed to send guest email:", err);
      }
  }

  // Send Email to Admin
  if (hotelAdminEmail) {
    const adminMessage = booking.status === 'Paid'
      ? 'A new booking has been paid and confirmed.'
      : 'A new booking has been created (Pay at Check-in).';

    try {
      await resend.emails.send({
        from: fromEmail,
        to: hotelAdminEmail,
        subject: `New Booking - ${roomName} (${checkIn} to ${checkOut})`,
        html: `
          <div style="font-family: sans-serif; color: #333;">
              <h1>New Booking Received</h1>
              <p>${adminMessage}</p>
              <h2>Booking Details</h2>
              <ul>
                  <li><strong>Booking ID:</strong> ${booking.id}</li>
                  <li><strong>Guest Name:</strong> ${guestName}</li>
                  <li><strong>Guest Email:</strong> ${guestEmail || 'N/A'}</li>
                  <li><strong>Room:</strong> ${roomName}</li>
                  <li><strong>Check-in:</strong> ${checkIn}</li>
                  <li><strong>Check-out:</strong> ${checkOut}</li>
                  <li><strong>Status:</strong> ${booking.status}</li>
              </ul>
          </div>
        `,
      });
    } catch (err) {
        console.error("Failed to send admin email:", err);
    }
  }
}
