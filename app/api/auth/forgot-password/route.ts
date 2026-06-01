import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendPasswordResetEmail } from '@/lib/mailer';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const GENERIC_RESPONSE = {
  message: 'If an account exists with this email, a reset link has been sent.',
};

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimit = checkRateLimit(`forgot-password:${ip}`, 3, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const data = forgotPasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true, email: true },
    });

    // Always return the same response to prevent user enumeration
    if (!user) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
    }

    // Invalidate any existing tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'https://pm2.yaagudyog.in';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
