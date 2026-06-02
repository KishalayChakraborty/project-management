import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const excludeOrgId = searchParams.get('excludeOrgId');
    const search = (searchParams.get('search') || '').slice(0, 100);

    // Orgs where the current user is admin or maintainer
    const myAdminOrgs = await prisma.orgMember.findMany({
      where: { userId: user.id, role: { in: ['ADMIN', 'MAINTAINER'] } },
      select: { orgId: true },
    });
    const myAdminOrgIds = myAdminOrgs.map((m) => m.orgId);

    if (myAdminOrgIds.length === 0) {
      return NextResponse.json({ virtualUsers: [] });
    }

    const virtualUsers = await prisma.user.findMany({
      where: {
        isVirtual: true,
        status: 'ACTIVE',
        mergedIntoId: null,
        // Virtual user must be a member of at least one org the current user admins
        orgMemberships: {
          some: { orgId: { in: myAdminOrgIds } },
        },
        // Must NOT already be a member of the target org
        ...(excludeOrgId
          ? { NOT: { orgMemberships: { some: { orgId: excludeOrgId } } } }
          : {}),
        // Optional search
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        isVirtual: true,
        createdAt: true,
        virtualProfile: true,
        orgMemberships: {
          select: {
            orgId: true,
            role: true,
            org: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ virtualUsers });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch virtual members' }, { status: 500 });
  }
}
