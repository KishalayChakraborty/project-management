import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = resetPasswordSchema.parse(body);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: data.token },
      include: { user: { select: { id: true, status: true } } },
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      if (resetToken) {
        await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
      }
      return NextResponse.json(
        { error: 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 }
      );
    }

    if (resetToken.user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Account is not active.' }, { status: 403 });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.delete({ where: { id: resetToken.id } }),
    ]);

    return NextResponse.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to reset password.' }, { status: 500 });
  }
}
