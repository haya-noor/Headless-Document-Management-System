/**
 * BasePersistenceService
 * Provides generic structure for translating between Domain Entities and Database Rows
 */

export interface BasePersistenceService<E, R> {
    toDomain(row: R): E;
    toPersistence(entity: E): R;
  }
  