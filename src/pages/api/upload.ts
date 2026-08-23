import type { APIRoute } from 'astro';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: import.meta.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: import.meta.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY,
  api_secret: import.meta.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET,
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No image provided' }), { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const fileUri = `data:${file.type};base64,${base64Data}`;

    const result = await cloudinary.uploader.upload(fileUri, {
      folder: 'albergobanne_rooms',
    });

    return new Response(JSON.stringify({ url: result.secure_url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to upload image' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
