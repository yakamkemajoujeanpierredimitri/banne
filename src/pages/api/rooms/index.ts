import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';

export const GET: APIRoute = async () => {
  try {
    const rooms = await prisma.room.findMany();
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
    if (!user || user.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const data = await request.json();
    const room = await prisma.room.create({
      data: {
        name: data.name,
        description: data.description,
        price: Number(data.price),
        imageUrl: data.image || '/src/assets/pic4.jpg',
        amenities: data.amenities || [],
        isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
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
