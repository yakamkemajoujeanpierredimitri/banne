import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const user = locals.user;
    const isAdmin = user && user.role === 'ADMIN';
    const now = new Date();

    let rooms;
    if (isAdmin) {
      rooms = await prisma.room.findMany({
        include: {
          bookings: {
            where: {
              checkInDate: { lte: now },
              checkOutDate: { gte: now },
              status: { not: 'Cancelled' }
            },
            include: {
              user: {
                select: { name: true, email: true }
              }
            }
          }
        }
      });
    } else {
      rooms = await prisma.room.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          amenities: true,
          isAvailable: true,
        }
      });
    }

    return new Response(JSON.stringify(rooms), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch rooms' }), {
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
    if (user.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    
    let data;
    try {
      data = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
    }
    
    if (!data.name || typeof data.name !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid or missing name' }), { status: 400 });
    }
    if (!data.description || typeof data.description !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid or missing description' }), { status: 400 });
    }
    
    const price = Number(data.price);
    if (isNaN(price) || price < 0) {
      return new Response(JSON.stringify({ error: 'Invalid price' }), { status: 400 });
    }

    let amenities = [];
    if (data.amenities) {
      if (Array.isArray(data.amenities)) {
        amenities = data.amenities;
      } else if (typeof data.amenities === 'string') {
        amenities = data.amenities.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      }
    }

    const room = await prisma.room.create({
      data: {
        name: data.name,
        description: data.description,
        price,
        imageUrl: data.image || '/src/assets/pic4.jpg',
        amenities,
        isAvailable: data.isAvailable !== undefined ? Boolean(data.isAvailable) : true,
      }
    });
    return new Response(JSON.stringify(room), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create room' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
