/**
 * Audit logging utility for Royal Design Studio
 * Records all sensitive business actions with user, entity, and metadata.
 */

import { prisma } from "@/lib/prisma";
import { AuditAction } from "@prisma/client";

interface AuditLogParams {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        description: params.description,
        metadata: params.metadata ? (params.metadata as object) : undefined,
        ipAddress: params.ipAddress,
      },
    });
  } catch (err) {
    // Audit logging must not break the main business operation
    console.error("[AuditLog] Failed to write audit log:", err);
  }
}
