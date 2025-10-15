import { UserEntity } from "../../../domain/user/entity";
import { BasePersistenceService } from "./base.persistence.service";

export class UserPersistenceService implements BasePersistenceService<UserEntity, any> {
  toDomain(row: any): UserEntity {
    return UserEntity.fromPersistence({
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  toPersistence(entity: UserEntity): any {
    return {
      id: entity.id.value,
      email: entity.email,
      firstName: entity.firstName,
      lastName: entity.lastName,
      role: entity.role,
      isActive: entity.isActiveValue,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
