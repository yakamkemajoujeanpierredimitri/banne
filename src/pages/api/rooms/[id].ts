import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma';

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return new Response(null, { status: 400 });

  try {
    const room = await prisma.room.findUnique({
      where: { id }
    });
    if (!room) return new Response(null, { status: 404 });
    return new Response(JSON.stringify(room), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch room' }), { status: 500 });
  }
}

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;
  if (!id) return new Response(null, { status: 400 });

  try {
    await prisma.room.delete({
      where: { id }
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete room' }), { status: 500 });
  }
}

export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params;
  if (!id) return new Response(null, { status: 400 });

  try {
    const data = await request.json();
    const room = await prisma.room.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price ? Number(data.price) : undefined,
        imageUrl: data.image,
        isAvailable: data.isAvailable,
      }
    });
    return new Response(JSON.stringify(room), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update room' }), { status: 500 });
  }
}
