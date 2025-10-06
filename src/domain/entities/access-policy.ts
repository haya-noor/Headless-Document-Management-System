/**
 * AccessPolicy domain entity
 * Represents access policies for managing permissions on resources with subject-based rules
 */

import { Schema } from '@effect/schema';
import { Effect } from 'effect';
import { PolicyIdVO, DateTimeVO } from '../value-objects';

/**
 * Permission action types for different access levels
 */
export enum PermissionAction {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  MANAGE = 'manage',
}

/**
 * Policy subject types
 */
export enum PolicySubjectType {
  USER = 'user',
  ROLE = 'role',
}

/**
 * Policy resource types
 */
export enum PolicyResourceType {
  DOCUMENT = 'document',
  USER = 'user',
}

/**
 * AccessPolicy entity schema
 * Defines the structure and validation rules for an access policy
 * priority:
 * when multiple policies match like:
 * Policy A: User: John, can READ(priority: 10)
 * Policy B: Role: User, can READ+WRITE(priority: 50)
 * Result: John gets  READ only (policy A wins becasue 10 < 50) lower number = higher priority
 * This implements the requirement:
 * Precedence: Admin > explicit subject policy (higher priority)> role policy (lower priority) 
 */
export const AccessPolicySchema = Schema.Struct({
  id: Schema.String.pipe(Schema.brand('PolicyId')),
  name: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(255)
  ),
  description: Schema.String.pipe(
    Schema.maxLength(1000)
  ),
  subjectType: Schema.Literal('user', 'role'),
  subjectId: Schema.String.pipe(Schema.brand('SubjectId')),
  resourceType: Schema.Literal('document', 'user'),
  resourceId: Schema.optional(Schema.String.pipe(Schema.brand('ResourceId'))),
  actions: Schema.Array(Schema.Literal('read', 'write', 'delete', 'manage')),
  isActive: Schema.Boolean,
  priority: Schema.Number.pipe(
    Schema.int(),
    Schema.positive()
  ),
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
});

export type AccessPolicy = Schema.Schema.Type<typeof AccessPolicySchema>;

/**
 * Helper functions for creating value objects
 */
function createPolicyId(id: string): PolicyIdVO {
  return Effect.runSync(PolicyIdVO.fromString(id));
}

function createDateTime(date: Date): DateTimeVO {
  return Effect.runSync(DateTimeVO.fromDate(date));
}

function createCurrentDateTime(): DateTimeVO {
  return Effect.runSync(DateTimeVO.now());
}

/**
 * AccessPolicy entity class
 * Encapsulates business logic and invariants
 * subjectType: user or role(role is a group of users)
 * resourceType: document or user
 */
export class AccessPolicyEntity {
  public readonly id: PolicyIdVO;
  public readonly name: string;
  public readonly description: string;
  public readonly subjectType: PolicySubjectType;
  public readonly subjectId: string;
  public readonly resourceType: PolicyResourceType;
  public readonly resourceId?: string;
  public readonly actions: PermissionAction[];
  public readonly isActive: boolean;
  public readonly priority: number;
  public readonly createdAt: DateTimeVO;
  public readonly updatedAt: DateTimeVO;

  /**
   * Private constructor - use static factory methods
   */
  private constructor(props: {
    id: PolicyIdVO;
    name: string;
    description: string;
    subjectType: PolicySubjectType;
    subjectId: string;
    resourceType: PolicyResourceType;
    resourceId?: string;
    actions: PermissionAction[];
    isActive: boolean;
    priority: number;
    createdAt: DateTimeVO;
    updatedAt: DateTimeVO;
  }) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.subjectType = props.subjectType;
    this.subjectId = props.subjectId;
    this.resourceType = props.resourceType;
    this.resourceId = props.resourceId;
    this.actions = props.actions;
    this.isActive = props.isActive;
    this.priority = props.priority;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Create a new access policy
   */
  static create(props: {
    id: string;
    name: string;
    description: string;
    subjectType: PolicySubjectType;
    subjectId: string;
    resourceType: PolicyResourceType;
    resourceId?: string;
    actions: PermissionAction[];
    priority?: number;
  }): AccessPolicyEntity {
    const now = createCurrentDateTime();
    
    return new AccessPolicyEntity({
      id: createPolicyId(props.id),
      name: props.name,
      description: props.description,
      subjectType: props.subjectType,
      subjectId: props.subjectId,
      resourceType: props.resourceType,
      resourceId: props.resourceId,
      actions: props.actions,
      isActive: true,
      priority: props.priority || 100,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Create access policy from persistence data
   */
  static fromPersistence(data: {
    id: string;
    name: string;
    description: string;
    subjectType: string;
    subjectId: string;
    resourceType: string;
    resourceId?: string;
    actions: string[];
    isActive: boolean;
    priority: number;
    createdAt: Date;
    updatedAt: Date;
  }): AccessPolicyEntity {
    return new AccessPolicyEntity({
      id: createPolicyId(data.id),
      name: data.name,
      description: data.description,
      subjectType: data.subjectType as PolicySubjectType,
      subjectId: data.subjectId,
      resourceType: data.resourceType as PolicyResourceType,
      resourceId: data.resourceId,
      actions: data.actions as PermissionAction[],
      isActive: data.isActive,
      priority: data.priority,
      createdAt: createDateTime(data.createdAt),
      updatedAt: createDateTime(data.updatedAt),
    });
  }

  /**
   * Convert to persistence format
   */
  toPersistence(): {
    id: string;
    name: string;
    description: string;
    subjectType: string;
    subjectId: string;
    resourceType: string;
    resourceId?: string;
    actions: string[];
    isActive: boolean;
    priority: number;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id.getValue(),
      name: this.name,
      description: this.description,
      subjectType: this.subjectType,
      subjectId: this.subjectId,
      resourceType: this.resourceType,
      resourceId: this.resourceId,
      actions: this.actions,
      isActive: this.isActive,
      priority: this.priority,
      createdAt: this.createdAt.getValue(),
      updatedAt: this.updatedAt.getValue(),
    };
  }

  /**
   * Check if policy applies to subject(user or role)
   */
  appliesToSubject(subjectType: PolicySubjectType, subjectId: string): boolean {
    return this.subjectType === subjectType && this.subjectId === subjectId;
  }

  /**
   * Check if policy applies to resource (document or user)
   */
  appliesToResource(resourceType: PolicyResourceType, resourceId?: string): boolean {
    if (this.resourceType !== resourceType) {
      return false;
    }
    
    // If policy has specific resource ID, it must match
    // Example: Policy A: User: John, can READ document: 123
    if (this.resourceId && resourceId) {
      return this.resourceId === resourceId;
    }
    
    // If policy has no specific resource ID, it applies to all resources of this type
    return !this.resourceId;
  }

  /**
   * Check if policy grants action
   */
  grantsAction(action: PermissionAction): boolean {
    return this.actions.includes(action);
  }

  /**
   * Check if policy is higher priority than another
   */
  hasHigherPriorityThan(other: AccessPolicyEntity): boolean {
    return this.priority < other.priority; // Lower number = higher priority
  }

  /**
   * Update policy actions
   */
  updateActions(actions: PermissionAction[]): AccessPolicyEntity {
    return new AccessPolicyEntity({
      ...this, // ... this is a spread operator to copy all properties from the current policy
      actions,
      updatedAt: createCurrentDateTime(),
    });
  }

  /**
   * Deactivate policy
   */
  deactivate(): AccessPolicyEntity {
    return new AccessPolicyEntity({
      ...this, 
      isActive: false,
      updatedAt: createCurrentDateTime(),
    });
  }

  /**
   * Activate policy
   */
  activate(): AccessPolicyEntity {
    return new AccessPolicyEntity({
      ...this,
      isActive: true,
      updatedAt: createCurrentDateTime(),
    });
  }

  /**
   * Update priority
   */
  updatePriority(priority: number): AccessPolicyEntity {
    return new AccessPolicyEntity({
      ...this,
      priority,
      updatedAt: createCurrentDateTime(),
    });
  }
}
