/**
 * Access Policy Service
 * Orchestrates access policy operations and business logic
 * Coordinates between repositories and domain entities
 * 
 * 
 * orchestrates access-policy use cases via AccessPolicyRepository interface(port), validates
 * input, build domain entities, calls repository methods, and returns the result
 * 
 * 
 * 
  */

import { Effect } from 'effect';
import { AccessPolicyEntity, PolicySubjectType, PolicyResourceType } from '../../domain/access-policy/entity';
import { PolicyIdVO } from '../../domain/access-policy/id';
import { UserIdVO } from '../../domain/user/id';
import { DocumentIdVO } from '../../domain/document/id';
import { AccessPolicyRepository, CreateAccessPolicyDTO, UpdateAccessPolicyDTO, AccessPolicyFilterDTO } from '../interfaces/access-policy.interface';
import { ValidationError, NotFoundError, ConflictError } from '../../domain/shared/base.interface';

export class AccessPolicyService {
  constructor(
    private accessPolicyRepository: AccessPolicyRepository
  ) {}

  /**
   * Create a new access policy
   */
  createPolicy(data: CreateAccessPolicyDTO): Effect.Effect<AccessPolicyEntity, ValidationError | ConflictError> {
    return Effect.gen(function* () {
      // Validate subject type and ID combination
      if (data.subjectType === 'user' && !data.subjectId) {
        return yield* Effect.fail(new ValidationError('Subject ID is required for user-specific policies'));
      }

      if (data.subjectType === 'role' && data.subjectId) {
        return yield* Effect.fail(new ValidationError('Subject ID should not be provided for role-based policies'));
      }

      // Validate resource type and ID combination
      if (data.resourceType === 'document' && !data.resourceId) {
        return yield* Effect.fail(new ValidationError('Resource ID is required for document-specific policies'));
      }

      if (data.resourceType === 'global' && data.resourceId) {
        return yield* Effect.fail(new ValidationError('Resource ID should not be provided for global policies'));
      }

      // Check for existing policy conflicts
      const existingPolicy = yield* this.accessPolicyRepository.existsForSubjectAndResource(
        data.subjectType,
        data.subjectId || '',
        data.resourceType,
        data.resourceId
      );

      if (existingPolicy) {
        return yield* Effect.fail(new ConflictError('Policy already exists for this subject and resource combination'));
      }

      // Create policy entity
      const policy = yield* AccessPolicyEntity.create({
        id: PolicyIdVO.generate(),
        name: data.name,
        description: data.description,
        subjectType: data.subjectType,
        subjectId: data.subjectId ? UserIdVO.fromString(data.subjectId) : undefined,
        resourceType: data.resourceType,
        resourceId: data.resourceId ? DocumentIdVO.fromString(data.resourceId) : undefined,
        actions: data.actions,
        priority: data.priority || 50,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Save to repository
      const savedPolicy = yield* this.accessPolicyRepository.create(data);
      return savedPolicy;
    }.bind(this));
  }

  /**
   * Find policy by ID
   */
  findById(id: string): Effect.Effect<AccessPolicyEntity, NotFoundError> {
    return this.accessPolicyRepository.findById(id);
  }

  /**
   * Find policies by subject
   */
  findBySubject(subjectType: 'user' | 'role', subjectId: string): Effect.Effect<AccessPolicyEntity[], never> {
    return this.accessPolicyRepository.findBySubject(subjectType, subjectId);
  }

  /**
   * Find policies by resource
   */
  findByResource(resourceType: 'document' | 'global', resourceId?: string): Effect.Effect<AccessPolicyEntity[], never> {
    return this.accessPolicyRepository.findByResource(resourceType, resourceId);
  }

  /**
   * Find applicable policies for user and resource
   */
  findApplicablePolicies(
    userId: string,
    resourceType: 'document' | 'global',
    resourceId?: string
  ): Effect.Effect<AccessPolicyEntity[], never> {
    return this.accessPolicyRepository.findApplicablePolicies(userId, resourceType, resourceId);
  }

  /**
   * Update policy
   */
  updatePolicy(id: string, data: UpdateAccessPolicyDTO): Effect.Effect<AccessPolicyEntity, NotFoundError | ValidationError> {
    return this.accessPolicyRepository.update(id, data);
  }

  /**
   * Deactivate policy
   */
  deactivatePolicy(id: string): Effect.Effect<AccessPolicyEntity, NotFoundError> {
    return this.accessPolicyRepository.deactivate(id);
  }

  /**
   * Activate policy
   */
  activatePolicy(id: string): Effect.Effect<AccessPolicyEntity, NotFoundError> {
    return this.accessPolicyRepository.activate(id);
  }

  /**
   * Update policy priority
   */
  updatePriority(id: string, priority: number): Effect.Effect<AccessPolicyEntity, NotFoundError | ValidationError> {
    if (priority < 1 || priority > 100) {
      return Effect.fail(new ValidationError('Priority must be between 1 and 100'));
    }

    return this.accessPolicyRepository.updatePriority(id, priority);
  }

  /**
   * Delete policy
   */
  deletePolicy(id: string): Effect.Effect<boolean, NotFoundError> {
    return this.accessPolicyRepository.delete(id);
  }

  /**
   * Find active policies
   */
  findActivePolicies(filters?: AccessPolicyFilterDTO): Effect.Effect<AccessPolicyEntity[], never> {
    return this.accessPolicyRepository.findActive(filters);
  }

  /**
   * Find policies by priority range
   */
  findByPriorityRange(minPriority: number, maxPriority: number): Effect.Effect<AccessPolicyEntity[], never> {
    return this.accessPolicyRepository.findByPriorityRange(minPriority, maxPriority);
  }

  /**
   * Create admin policy for user
   */
  createAdminPolicy(userId: string): Effect.Effect<AccessPolicyEntity, ValidationError | ConflictError> {
    return this.createPolicy({
      name: `Admin Policy for User ${userId}`,
      description: 'Full access policy for admin user',
      subjectType: 'user',
      subjectId: userId,
      resourceType: 'global',
      actions: ['read', 'write', 'delete', 'manage'],
      priority: 1 // Highest priority
    });
  }

  /**
   * Create user role policy
   */
  createUserRolePolicy(): Effect.Effect<AccessPolicyEntity, ValidationError | ConflictError> {
    return this.createPolicy({
      name: 'User Role Policy',
      description: 'Default policy for regular users',
      subjectType: 'role',
      resourceType: 'global',
      actions: ['read'],
      priority: 50 // Medium priority
    });
  }

  /**
   * Create document-specific policy
   */
  createDocumentPolicy(
    userId: string,
    documentId: string,
    actions: string[],
    priority = 10
  ): Effect.Effect<AccessPolicyEntity, ValidationError | ConflictError> {
    return this.createPolicy({
      name: `Document Policy for User ${userId}`,
      description: `Access policy for specific document`,
      subjectType: 'user',
      subjectId: userId,
      resourceType: 'document',
      resourceId: documentId,
      actions,
      priority
    });
  }

  /**
   * Get policy statistics
   */
  getPolicyStatistics(): Effect.Effect<{
    total: number;
    active: number;
    inactive: number;
    bySubjectType: Record<string, number>;
    byResourceType: Record<string, number>;
  }, never> {
    return Effect.gen(function* () {
      const allPolicies = yield* this.accessPolicyRepository.findMany();
      const activePolicies = yield* this.accessPolicyRepository.findActive();

      const stats = {
        total: allPolicies.length,
        active: activePolicies.length,
        inactive: allPolicies.length - activePolicies.length,
        bySubjectType: {} as Record<string, number>,
        byResourceType: {} as Record<string, number>
      };

      // Count by subject type
      allPolicies.forEach(policy => {
        stats.bySubjectType[policy.subjectType] = (stats.bySubjectType[policy.subjectType] || 0) + 1;
        stats.byResourceType[policy.resourceType] = (stats.byResourceType[policy.resourceType] || 0) + 1;
      });

      return stats;
    }.bind(this));
  }
}

