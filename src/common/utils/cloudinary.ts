import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(
  file: Express.Multer.File,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'campaign-banners' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );
    Readable.from(file.buffer).pipe(uploadStream);
  });
}
