import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.user.id },
  });
}

export async function getOrgMember(orgId: string, userId: string) {
  return prisma.orgMember.findUnique({
    where: {
      orgId_userId: {
        orgId,
        userId,
      },
    },
  });
}

export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function requireOrgAccess(orgId: string, userId: string) {
  const member = await getOrgMember(orgId, userId);
  
  if (!member) {
    throw new Error('Access denied');
  }

  return member;
}

export async function requireOrgRole(
  orgId: string,
  userId: string,
  roles: Array<'ADMIN' | 'MAINTAINER' | 'MEMBER'>
) {
  const member = await requireOrgAccess(orgId, userId);
  
  if (!roles.includes(member.role)) {
    throw new Error('Insufficient permissions');
  }

  return member;
}

export async function requireProjectAccess(orgId: string, projectId: string, userId: string) {
  const member = await requireOrgAccess(orgId, userId);

  if (member.role === 'ADMIN' || member.role === 'MAINTAINER') {
    return member;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { orgId: true },
  });

  if (!project || project.orgId !== orgId) {
    throw new Error('Project not found');
  }

  const [viaTeam, viaUserLink] = await Promise.all([
    prisma.projectTeamLink.findFirst({
      where: {
        projectId,
        team: {
          members: {
            some: { userId },
          },
        },
      },
    }),
    prisma.projectUserLink.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
    }),
  ]);

  if (!viaTeam && !viaUserLink) {
    throw new Error('Access denied');
  }

  return member;
}

