import prisma from './prisma';
import type { Prisma } from '@/app/generated/prisma/client';

interface AuditLogParams {
  orgId?: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  action: string;
  diffJson?: Record<string, unknown>;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        orgId: params.orgId ?? null,
        actorUserId: params.actorUserId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        diffJson: (params.diffJson ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch {
    // Audit log failures must not break the main operation
  }
}
