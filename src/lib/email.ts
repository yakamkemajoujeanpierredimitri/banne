import { Resend } from 'resend';
import { prisma } from './prisma';

const resendApiKey = import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY || '';
const resend = new Resend(resendApiKey);

export async function sendBookingConfirmation(bookingId: string) {
  if (!resendApiKey) {
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

  const checkIn = booking.checkInDate.toLocaleDateString('en-US');
  const checkOut = booking.checkOutDate.toLocaleDateString('en-US');
  const guestName = booking.user?.name || 'Valued Guest';
  const guestEmail = booking.user?.email;
  const roomName = booking.room.name;
  
  // You would typically set this in .env as well
  const hotelAdminEmail = import.meta.env.HOTEL_ADMIN_EMAIL || process.env.HOTEL_ADMIN_EMAIL || 'admin@albergobanne.com';
  // Note: For Resend free tier, 'from' must be a verified domain.
  // We'll use a placeholder domain here, assuming you will configure it in Resend.
  const fromEmail = 'Albergobanne Hotel <onboarding@resend.dev>'; // 'onboarding@resend.dev' works for testing on free tier

  if (!guestEmail) {
      console.warn('No guest email found, skipping guest confirmation email');
  } else {
      // Send Email to Guest
      try {
        await resend.emails.send({
          from: fromEmail,
          to: guestEmail,
          subject: `Booking Confirmed - ${roomName}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h1 style="color: #c4a47c;">Booking Confirmation</h1>
                <p>Dear ${guestName},</p>
                <p>Thank you for choosing Albergobanne Hotel. Your booking has been confirmed and paid successfully.</p>
                
                <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h2 style="margin-top: 0; font-size: 1.2rem;">Booking Details</h2>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        <li style="margin-bottom: 10px;"><strong>Booking ID:</strong> ${booking.id}</li>
                        <li style="margin-bottom: 10px;"><strong>Room:</strong> ${roomName}</li>
                        <li style="margin-bottom: 10px;"><strong>Check-in:</strong> ${checkIn}</li>
                        <li style="margin-bottom: 10px;"><strong>Check-out:</strong> ${checkOut}</li>
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
  try {
    await resend.emails.send({
      from: fromEmail,
      to: hotelAdminEmail,
      subject: `New Booking - ${roomName} (${checkIn} to ${checkOut})`,
      html: `
        <div style="font-family: sans-serif; color: #333;">
            <h1>New Booking Received</h1>
            <p>A new booking has been paid and confirmed.</p>
            <h2>Booking Details</h2>
            <ul>
                <li><strong>Booking ID:</strong> ${booking.id}</li>
                <li><strong>Guest Name:</strong> ${guestName}</li>
                <li><strong>Guest Email:</strong> ${guestEmail || 'N/A'}</li>
                <li><strong>Room:</strong> ${roomName}</li>
                <li><strong>Check-in:</strong> ${checkIn}</li>
                <li><strong>Check-out:</strong> ${checkOut}</li>
            </ul>
        </div>
      `,
    });
  } catch (err) {
      console.error("Failed to send admin email:", err);
  }
}
