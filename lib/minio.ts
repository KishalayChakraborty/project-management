import * as Minio from 'minio';
import { Readable } from 'stream';

let minioClient: Minio.Client | null = null;

export function getMinioClient(): Minio.Client {
  if (minioClient) return minioClient;

  const endpoint = process.env.MINIO_ENDPOINT || 'localhost:9000';
  const useSSL = process.env.MINIO_USE_SSL === 'true';
  const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
  const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';

  console.log('🔧 MinIO Client Config:', {
    endpoint,
    useSSL,
    region: 'us-east-1',
    // Don't log credentials
  });

  const [host, port] = endpoint.includes(':')
    ? endpoint.split(':')
    : [endpoint, '9000'];

  minioClient = new Minio.Client({
    endPoint: host,
    port: parseInt(port),
    useSSL,
    accessKey,
    secretKey,
  });

  return minioClient;
}

export async function uploadFile(
  file: Buffer,
  fileName: string,
  mimeType: string,
  bucketName: string = process.env.MINIO_UPLOADS_BUCKET || 'uploads'
): Promise<{ path: string; url: string }> {
  try {
    const client = getMinioClient();
    const timestamp = Date.now();
    const uniquePath = `${timestamp}-${fileName}`;

    console.log('📤 Starting file upload:', {
      fileName,
      size: file.length,
      mimeType,
      bucket: bucketName,
      path: uniquePath,
    });

    // Ensure bucket exists
    console.log('🪣 Checking if bucket exists:', bucketName);
    const bucketExists = await client.bucketExists(bucketName);

    if (!bucketExists) {
      console.log('📍 Creating bucket:', bucketName);
      await client.makeBucket(bucketName, 'us-east-1');
    }

    // Convert buffer to stream for MinIO
    const stream = Readable.from(file);

    // Upload file
    console.log('⬆️ Uploading to MinIO...');
    await client.putObject(bucketName, uniquePath, stream, file.length, {
      'Content-Type': mimeType,
    });

    // Generate public URL
    const publicUrl = `${process.env.MINIO_PUBLIC_URL}/${bucketName}/${uniquePath}`;

    console.log('✅ File uploaded successfully:', publicUrl);

    return {
      path: `${bucketName}/${uniquePath}`,
      url: publicUrl,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ MinIO upload error:', {
      message: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  const client = getMinioClient();
  const [bucketName, ...pathParts] = filePath.split('/');
  const objectName = pathParts.join('/');

  await client.removeObject(bucketName, objectName);
}

export async function getFileUrl(filePath: string): Promise<string> {
  const [bucketName, ...pathParts] = filePath.split('/');
  const objectName = pathParts.join('/');
  const publicUrl = `${process.env.MINIO_PUBLIC_URL}/${bucketName}/${objectName}`;
  return publicUrl;
}

export async function validateBucket(bucketName: string = process.env.MINIO_UPLOADS_BUCKET || 'uploads'): Promise<boolean> {
  try {
    const client = getMinioClient();
    const exists = await client.bucketExists(bucketName);
    if (!exists) {
      await client.makeBucket(bucketName, 'us-east-1');
    }
    return true;
  } catch (error) {
    console.error('MinIO bucket validation error:', error);
    return false;
  }
}
