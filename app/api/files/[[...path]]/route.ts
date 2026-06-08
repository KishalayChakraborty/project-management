import { NextResponse } from 'next/server';
import { getMinioClient } from '@/lib/minio';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  try {
    const { path } = await params;

    if (!path || path.length === 0) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }

    const filePath = path.join('/');
    const [bucket, ...objectPath] = filePath.split('/');
    const objectName = objectPath.join('/');

    console.log('📥 Proxying file request:', { bucket, objectName });

    const client = getMinioClient();
    const buffer = await new Promise<Buffer>(async (resolve, reject) => {
      try {
        const chunks: Uint8Array[] = [];
        const stream = await client.getObject(bucket, objectName);

        stream.on('data', (chunk: Uint8Array) => {
          chunks.push(chunk);
        });

        stream.on('end', () => {
          const concatenated = Buffer.concat(chunks.map(c => Buffer.from(c)));
          resolve(concatenated);
        });

        stream.on('error', (err: Error) => {
          console.error('❌ MinIO stream error:', err.message);
          reject(err);
        });
      } catch (err) {
        console.error('❌ MinIO getObject error:', err instanceof Error ? err.message : String(err));
        reject(err);
      }
    });

    console.log('✅ File retrieved from MinIO:', objectName);

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ File proxy error:', errorMsg);
    return NextResponse.json(
      { error: 'Failed to fetch file', details: errorMsg },
      { status: 500 }
    );
  }
}
