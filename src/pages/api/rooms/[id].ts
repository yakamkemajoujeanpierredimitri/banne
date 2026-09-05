import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';
import { Prisma } from '@prisma/client';

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 });

  try {
    const room = await prisma.room.findUnique({
      where: { id }
    });
    if (!room) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    return new Response(JSON.stringify(room), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch room' }), { status: 500 });
  }
}

export const DELETE: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  if (user.role !== 'ADMIN') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });

  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 });

  try {
    const room = await prisma.room.findUnique({
      where: { id },
      include: { bookings: { where: { status: { not: 'Cancelled' } } } }
    });
    if (!room) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    
    if (room.bookings.length > 0) {
      return new Response(JSON.stringify({ error: 'Cannot delete room with active bookings' }), { status: 400 });
    }

    await prisma.room.delete({
      where: { id }
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete room' }), { status: 500 });
  }
}

export const PUT: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  if (user.role !== 'ADMIN') return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });

  const { id } = params;
  if (!id) return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400 });

  try {
    let data;
    try {
      data = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
    }

    const updateData: Prisma.RoomUpdateInput = {};
    
    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || !data.name) return new Response(JSON.stringify({ error: 'Invalid name' }), { status: 400 });
      updateData.name = data.name;
    }
    
    if (data.description !== undefined) {
      if (typeof data.description !== 'string' || !data.description) return new Response(JSON.stringify({ error: 'Invalid description' }), { status: 400 });
      updateData.description = data.description;
    }
    
    if (data.price !== undefined) {
      const price = Number(data.price);
      if (isNaN(price) || price < 0) return new Response(JSON.stringify({ error: 'Invalid price' }), { status: 400 });
      updateData.price = price;
    }

    if (data.image !== undefined) {
      updateData.imageUrl = data.image;
    }

    if (data.isAvailable !== undefined) {
      updateData.isAvailable = Boolean(data.isAvailable);
    }

    if (data.amenities !== undefined) {
      if (Array.isArray(data.amenities)) {
        updateData.amenities = data.amenities;
      } else if (typeof data.amenities === 'string') {
        updateData.amenities = data.amenities.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      } else {
        return new Response(JSON.stringify({ error: 'Invalid amenities format' }), { status: 400 });
      }
    }

    const room = await prisma.room.update({
      where: { id },
      data: updateData
    });
    return new Response(JSON.stringify(room), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update room' }), { status: 500 });
  }
}
