import { BasePersistenceService } from "./base.persistence.service";

export class AuditLogPersistenceService implements BasePersistenceService<any, any> {
  toDomain(row: any) {
    return {
      id: row.id,
      documentId: row.documentId,
      userId: row.userId,
      action: row.action,
      details: row.details,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt,
    };
  }

  toPersistence(entity: any) {
    return { ...entity };
  }
}
