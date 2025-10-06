/**
 * AccessPolicy Repository Interface
 * Effect-based interface for access policy data operations
 * Following d4-effect.md requirements for effectful signatures and typed errors
 */

import { Effect } from 'effect';
import { EffectBaseRepository, RepositoryErrorType } from './effect-base.repository';
import { AccessPolicyEntity } from '../../domain/entities';

/**
 * AccessPolicy creation data transfer object
 */
export interface CreateAccessPolicyDTO {
  name: string;
  description?: string;
  subjectType: 'user' | 'role';
  subjectId?: string; // nullable for role-based policies
  resourceType: 'document' | 'global';
  resourceId?: string; // nullable for global policies
  actions: string[];
  priority?: number;
}

/**
 * AccessPolicy update data transfer object
 */
export interface UpdateAccessPolicyDTO {
  name?: string;
  description?: string;
  actions?: string[];
  priority?: number;
  isActive?: boolean;
}

/**
 * AccessPolicy filter data transfer object
 */
export interface AccessPolicyFilterDTO {
  subjectType?: 'user' | 'role';
  subjectId?: string;
  resourceType?: 'document' | 'global';
  resourceId?: string;
  isActive?: boolean;
  priority?: number;
  minPriority?: number;
  maxPriority?: number;
}

/**
 * AccessPolicy repository interface
 * Provides Effect-based operations for access policy management
 */
export interface AccessPolicyRepository extends EffectBaseRepository<
  AccessPolicyEntity,
  CreateAccessPolicyDTO,
  UpdateAccessPolicyDTO,
  AccessPolicyFilterDTO
> {
  /**
   * Find policies by subject (user or role)
   * @param {string} subjectType - Type of subject ('user' or 'role')
   * @param {string} subjectId - Subject identifier
   * @returns {Effect.Effect<AccessPolicyEntity[], RepositoryErrorType>} Array of policies or error
   */
  findBySubject(
    subjectType: 'user' | 'role',
    subjectId: string
  ): Effect.Effect<AccessPolicyEntity[], RepositoryErrorType>;

  /**
   * Find policies by resource
   * @param {string} resourceType - Type of resource ('document' or 'global')
   * @param {string} resourceId - Resource identifier (optional for global)
   * @returns {Effect.Effect<AccessPolicyEntity[], RepositoryErrorType>} Array of policies or error
   */
  findByResource(
    resourceType: 'document' | 'global',
    resourceId?: string
  ): Effect.Effect<AccessPolicyEntity[], RepositoryErrorType>;

  /**
   * Find policies that apply to a specific user and resource
   * @param {string} userId - User identifier
   * @param {string} resourceType - Type of resource
   * @param {string} resourceId - Resource identifier (optional for global)
   * @returns {Effect.Effect<AccessPolicyEntity[], RepositoryErrorType>} Array of applicable policies or error
   */
  findApplicablePolicies(
    userId: string,
    resourceType: 'document' | 'global',
    resourceId?: string
  ): Effect.Effect<AccessPolicyEntity[], RepositoryErrorType>;

  /**
   * Find policies by priority range
   * @param {number} minPriority - Minimum priority (inclusive)
   * @param {number} maxPriority - Maximum priority (inclusive)
   * @returns {Effect.Effect<AccessPolicyEntity[], RepositoryErrorType>} Array of policies or error
   */
  findByPriorityRange(
    minPriority: number,
    maxPriority: number
  ): Effect.Effect<AccessPolicyEntity[], RepositoryErrorType>;

  /**
   * Find active policies only
   * @param {AccessPolicyFilterDTO} filters - Optional filters
   * @returns {Effect.Effect<AccessPolicyEntity[], RepositoryErrorType>} Array of active policies or error
   */
  findActive(filters?: AccessPolicyFilterDTO): Effect.Effect<AccessPolicyEntity[], RepositoryErrorType>;

  /**
   * Deactivate policy by ID
   * @param {string} id - Policy identifier
   * @returns {Effect.Effect<AccessPolicyEntity, RepositoryErrorType>} Updated policy or error
   */
  deactivate(id: string): Effect.Effect<AccessPolicyEntity, RepositoryErrorType>;

  /**
   * Activate policy by ID
   * @param {string} id - Policy identifier
   * @returns {Effect.Effect<AccessPolicyEntity, RepositoryErrorType>} Updated policy or error
   */
  activate(id: string): Effect.Effect<AccessPolicyEntity, RepositoryErrorType>;

  /**
   * Update policy priority
   * @param {string} id - Policy identifier
   * @param {number} priority - New priority
   * @returns {Effect.Effect<AccessPolicyEntity, RepositoryErrorType>} Updated policy or error
   */
  updatePriority(id: string, priority: number): Effect.Effect<AccessPolicyEntity, RepositoryErrorType>;

  /**
   * Check if policy exists for subject and resource combination
   * @param {string} subjectType - Type of subject
   * @param {string} subjectId - Subject identifier
   * @param {string} resourceType - Type of resource
   * @param {string} resourceId - Resource identifier (optional for global)
   * @returns {Effect.Effect<boolean, RepositoryErrorType>} True if policy exists or error
   */
  existsForSubjectAndResource(
    subjectType: 'user' | 'role',
    subjectId: string,
    resourceType: 'document' | 'global',
    resourceId?: string
  ): Effect.Effect<boolean, RepositoryErrorType>;
}
