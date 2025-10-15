import { DocumentEntity } from "../../../domain/document/entity";
import { BasePersistenceService } from "./base.persistence.service";

export class DocumentPersistenceService implements BasePersistenceService<DocumentEntity, any> {
  toDomain(row: any): DocumentEntity {
    return DocumentEntity.fromPersistence({
      id: row.id,
      ownerId: row.ownerId,
      title: row.title,
      description: row.description,
      tags: row.tags,
      currentVersionId: row.currentVersionId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  toPersistence(entity: DocumentEntity): any {
    return {
      id: entity.id.value,
      ownerId: entity.ownerId.value,
      title: entity.title,
      description: entity.description,
      tags: entity.tags,
      currentVersionId: entity.currentVersionId.value,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
