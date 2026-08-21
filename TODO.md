# Albergobanne — Development Roadmap

> Last updated: 2026-08-21

## Current Status

The site has a solid foundation (Astro + SolidJS + Prisma + Neon PostgreSQL) with working pages for the homepage (4 languages), room listings, room detail + booking widget, admin dashboard, and user dashboard. However, **everything runs on hardcoded mock data** — nothing is connected to the database yet, there is no authentication, and several essential hotel-website features are missing.

---

## Phase 1 — Critical Fixes

These must be resolved before anything else works.

### 1.1 Fix Prisma Configuration
- [x] Add `url = env("DATABASE_URL")` to `datasource db` block in `prisma/schema.prisma`
- [x] Run `npx prisma generate` to create the Prisma client
- [x] Run `npx prisma db push` (or `prisma migrate dev`) to sync the schema with Neon

### 1.2 Create API Endpoints
- [x] Create `src/pages/api/rooms/index.ts` — GET all rooms, POST new room
- [x] Create `src/pages/api/rooms/[id].ts` — GET/PUT/DELETE single room
- [x] Create `src/pages/api/bookings/index.ts` — GET all bookings, POST new booking
- [x] Create `src/pages/api/bookings/[id].ts` — GET/PUT/DELETE single booking
- [x] Add server-side validation with Zod (check-out > check-in, no double-booking, etc.)

### 1.3 Connect Frontend to Database
- [x] Replace mock data in `src/pages/rooms/index.astro` with Prisma query
- [x] Replace mock data in `src/pages/rooms/[id].astro` with Prisma query
- [x] Update `BookingWidget.jsx` to POST to `/api/bookings` instead of using `setTimeout`
- [x] Update `AdminReservationsManager.jsx` to fetch/mutate via `/api/bookings`
- [x] Update `AdminRoomsManager.jsx` to fetch/mutate via `/api/rooms`
- [x] Update `dashboard.astro` to fetch the logged-in user's bookings

### 1.4 Switch to Server-Side Rendering for Dynamic Pages
- [x] Add `output: 'hybrid'` (or `'server'`) to `astro.config.mjs`
- [x] Remove `getStaticPaths()` from `src/pages/rooms/[id].astro` — use server-side data fetching instead
- [x] This is required because room IDs will be database UUIDs, not hardcoded `'1', '2', '3'`

### 1.5 Add Authentication
- [x] Create Session and update User models in Prisma (`prisma/schema.prisma`)
- [x] Create login and registration pages (`src/pages/login.astro`, `src/pages/register.astro`)
- [x] Create Astro middleware (`src/middleware.ts`) to protect `/admin/*` and `/dashboard` routes
- [x] Only show the "Admin" nav link to users with `role = "ADMIN"` (or protect the route)
- [x] Wire the "Log Out" button on the user dashboard to actually log out via `/api/auth/logout`

---

## Phase 2 — Important Improvements

These improve quality, usability, and SEO significantly.

### 2.1 Add a Footer
- [x] Create `src/components/Footer.astro`
- [x] Include: hotel address, phone number, email, social media links, copyright
- [x] Add it to `Layout.astro` so it appears on every page

### 2.2 Mobile Navigation
- [x] Add a hamburger menu button (visible on small screens) to the nav bar in `Layout.astro`
- [x] Create a slide-out or dropdown mobile menu
- [x] Hide the desktop nav links on mobile, show the hamburger instead

### 2.3 SEO Meta Tags
- [x] Update `Layout.astro` Props to accept `description`, `ogImage`, and `canonicalUrl`
- [x] Add `<meta name="description">` per page
- [x] Add Open Graph tags (`og:title`, `og:image`, `og:description`, `og:url`)
- [x] Fix `<html lang="en">` → use `Astro.currentLocale` dynamically
- [ ] Add JSON-LD structured data for `Hotel` / `LodgingBusiness` schema on the homepage

### 2.4 Complete the Internationalization (i18n)
- [x] Create `src/i18n/ui.ts` with translation dictionaries for IT, EN, FR, NL
- [x] Create a `t(key)` helper function in `src/i18n/utils.ts`
- [x] Replace all hardcoded text across pages with `t('key')` calls
- [x] Add locale-specific versions of rooms, dashboard, and admin pages (or use a single template with translations)
- [x] Stop duplicating entire page files per locale — use one component + translation data

### 2.5 Clean Up Duplicated CSS
- [x] Extract the hero/features styles (~90 lines) duplicated across `index.astro`, `en/index.astro`, `fr/index.astro`, `nl/index.astro`
- [x] Move them into `src/styles/global.css` or a shared `Hero.astro` component
- [x] Same for the admin table/modal styles duplicated between `dashboard.astro` styles and `AdminReservationsManager.jsx` inline styles

---

## Phase 3 — New Features

These add real business value to the hotel website.

### 3.1 Payment Integration (Stripe)
- [ ] Install `stripe` package
- [ ] Create `src/pages/api/checkout.ts` — creates a Stripe Checkout session
- [ ] After successful booking, redirect to Stripe payment page
- [ ] Create `src/pages/booking/success.astro` and `src/pages/booking/cancel.astro` return pages
- [ ] Add a Stripe webhook endpoint to update booking status to "Paid" automatically

### 3.2 Booking Confirmation Emails
- [ ] Install `resend` (or another email provider)
- [ ] Send a confirmation email to the guest after booking
- [ ] Send a notification email to the hotel admin for every new booking
- [ ] Include booking details: room name, dates, guest name, booking ID

### 3.3 Contact Page
- [x] Create `src/pages/contact.astro`
- [x] Include: hotel address, phone, email
- [x] Embed a Google Maps iframe showing the hotel location
- [x] Optionally add a contact form that sends an email via the API

### 3.4 Reviews / Testimonials
- [ ] Add a testimonials section to the homepage (can be static initially)
- [ ] Later: add a `Review` model to Prisma (rating, comment, guestName, roomId)
- [ ] Allow guests to leave reviews after their stay

### 3.5 Availability Calendar
- [ ] On the room detail page, show a visual calendar with available/booked dates
- [ ] Query existing `Booking` records for that room to determine blocked dates
- [ ] Disable already-booked dates in the booking widget date picker

### 3.6 Per-Room Amenities
- [ ] Add an `amenities` field to the `Room` model (either JSON array or a separate `Amenity` model)
- [ ] Replace the hardcoded amenities list in `rooms/[id].astro` with data from the database
- [ ] Let admins manage amenities per room in the admin panel

### 3.7 Proper Image Upload (Cloud Storage)
- [ ] Set up cloud storage (Cloudflare R2, AWS S3, or Cloudinary)
- [ ] Create `src/pages/api/upload.ts` endpoint for image uploads
- [ ] Update the admin "Add Room" form to upload images to cloud storage and save the URL
- [ ] Currently `AdminRoomsManager.jsx` uses `URL.createObjectURL` which is lost on refresh

### 3.8 Error Pages
- [x] Create `src/pages/404.astro` — custom "Page Not Found" page
- [x] Create `src/pages/500.astro` — custom server error page
- [x] Style them consistently with the rest of the site

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Framework | Astro (SSR with Node adapter) |
| Interactive UI | SolidJS (Astro Islands) |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Auth | TBD (better-auth / Lucia / Auth.js) |
| Payments | TBD (Stripe) |
| Email | TBD (Resend / SendGrid) |
| Storage | TBD (Cloudflare R2 / S3 / Cloudinary) |
| Hosting | TBD |
