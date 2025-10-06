/**
 * Base repository interface
 * Defines generic CRUD operations for all repositories
 */

import { PaginationParams, PaginatedResponse } from '../../types';

/**
 * Generic repository interface for CRUD operations
 * @template T - Entity type
 * @template CreateDTO - Data transfer object for creation
 * @template UpdateDTO - Data transfer object for updates
 * @template FilterDTO - Data transfer object for filtering
 */
export interface BaseRepository<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>, FilterDTO = any> {
  /**
   * Find entity by ID
   * @param {string} id - Entity unique identifier
   * @returns {Promise<T | null>} Entity or null if not found
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find multiple entities with optional filtering
   * @param {FilterDTO} filters - Optional filters to apply
   * @returns {Promise<T[]>} Array of entities
   */
  findMany(filters?: FilterDTO): Promise<T[]>;

  /**
   * Find entities with pagination
   * @param {PaginationParams} pagination - Pagination parameters
   * @param {FilterDTO} filters - Optional filters to apply
   * @returns {Promise<PaginatedResponse<T>>} Paginated response
   */
  findManyPaginated(
    pagination: PaginationParams,
    filters?: FilterDTO
  ): Promise<PaginatedResponse<T>>;

  /**
   * Find single entity by filters
   * @param {FilterDTO} filters - Filters to apply
   * @returns {Promise<T | null>} Entity or null if not found
   */
  findOne(filters: FilterDTO): Promise<T | null>;

  /**
   * Create new entity
   * @param {CreateDTO} data - Data for entity creation
   * @returns {Promise<T>} Created entity
   */
  create(data: CreateDTO): Promise<T>;

  /**
   * Create multiple entities
   * @param {CreateDTO[]} data - Array of data for entity creation
   * @returns {Promise<T[]>} Array of created entities
   */
  createMany(data: CreateDTO[]): Promise<T[]>;

  /**
   * Update entity by ID
   * @param {string} id - Entity unique identifier
   * @param {UpdateDTO} data - Data for entity update
   * @returns {Promise<T | null>} Updated entity or null if not found
   */
  update(id: string, data: UpdateDTO): Promise<T | null>;

  /**
   * Update multiple entities by filters
   * @param {FilterDTO} filters - Filters to identify entities to update
   * @param {UpdateDTO} data - Data for entity update
   * @returns {Promise<number>} Number of updated entities
   */
  updateMany(filters: FilterDTO, data: UpdateDTO): Promise<number>;

  /**
   * Delete entity by ID
   * @param {string} id - Entity unique identifier
   * @returns {Promise<boolean>} True if entity was deleted
   */
  delete(id: string): Promise<boolean>;

  /**
   * Soft delete entity by ID (if supported)
   * @param {string} id - Entity unique identifier
   * @returns {Promise<boolean>} True if entity was soft deleted
   */
  softDelete?(id: string): Promise<boolean>;

  /**
   * Delete multiple entities by filters
   * @param {FilterDTO} filters - Filters to identify entities to delete
   * @returns {Promise<number>} Number of deleted entities
   */
  deleteMany(filters: FilterDTO): Promise<number>;

  /**
   * Check if entity exists by ID
   * @param {string} id - Entity unique identifier
   * @returns {Promise<boolean>} True if entity exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Count entities with optional filtering
   * @param {FilterDTO} filters - Optional filters to apply
   * @returns {Promise<number>} Number of entities
   */
  count(filters?: FilterDTO): Promise<number>;
}
