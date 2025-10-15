import { BasePersistenceService } from "./base.persistence.service";

export class PermissionPersistenceService implements BasePersistenceService<any, any> {
  toDomain(row: any) {
    return {
      id: row.id,
      documentId: row.documentId,
      userId: row.userId,
      permission: row.permission,
      grantedBy: row.grantedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  toPersistence(entity: any) {
    return { ...entity };
  }
}
