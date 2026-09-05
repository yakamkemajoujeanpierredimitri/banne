import type { APIRoute } from 'astro';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: import.meta.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: import.meta.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY,
  api_secret: import.meta.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    if (user.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const formData = await request.formData();
    const file = formData.get('image');

    if (!file || typeof file === 'string' || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No valid image provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File is too large. Maximum size is 5MB.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Instead of using Base64 URI, use upload_stream which is better for memory
    const result: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'albergobanne_rooms' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return new Response(JSON.stringify({ url: result.secure_url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Failed to upload image' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
