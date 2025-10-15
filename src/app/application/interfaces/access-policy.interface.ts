/**
 * Effect-based Access Policy Repository Interface
 * Defines access-policy-specific data access operations using Effect
 * Following d4-effect.md requirements for effectful signatures and typed errors
 * 
 * Uses Effect Schema concepts with pick/omit to eliminate repetition
 */

import { Effect } from 'effect';
import { Schema } from '@effect/schema';
import { Repository, DatabaseError, NotFoundError, ValidationError } from "../shared/errors";
import { PaginationParams, PaginatedResponse } from '../../domain/shared/api.interface';
import { AccessPolicyEntity, AccessPolicySchema } from '../../domain/access-policy/entity';

/**
 * Base access policy fields schema - core access policy properties
 */
const BaseAccessPolicyFieldsSchema = Schema.Struct({
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
  actions: Schema.Array(Schema.Literal('read', 'write', 'delete', 'manage')).pipe(
    Schema.minItems(1),
    Schema.maxItems(4)
  ),
  isActive: Schema.Boolean,
  priority: Schema.Number.pipe(
    Schema.int(),
    Schema.positive(),
    Schema.lessThanOrEqualTo(1000)
  ),
});

/**
 * Optional access policy fields schema - fields that can be optional
 */
const OptionalAccessPolicyFieldsSchema = Schema.Struct({
  resourceId: Schema.optional(Schema.String.pipe(Schema.brand('ResourceId'))),
});

/**
 * AccessPolicy creation data transfer object schema
 * Combines base fields with optional fields for creation
 */
export const CreateAccessPolicyDTOSchema = Schema.Struct({
  ...BaseAccessPolicyFieldsSchema.fields,
  ...OptionalAccessPolicyFieldsSchema.fields,
});

/**
 * AccessPolicy update data transfer object schema
 * All fields are optional for updates, plus additional update-specific fields
 */
export const UpdateAccessPolicyDTOSchema = Schema.Struct({
  name: Schema.optional(Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(255)
  )),
  description: Schema.optional(Schema.String.pipe(
    Schema.maxLength(1000)
  )),
  subjectType: Schema.optional(Schema.Literal('user', 'role')),
  subjectId: Schema.optional(Schema.String.pipe(Schema.brand('SubjectId'))),
  resourceType: Schema.optional(Schema.Literal('document', 'user')),
  resourceId: Schema.optional(Schema.String.pipe(Schema.brand('ResourceId'))),
  actions: Schema.optional(Schema.Array(Schema.Literal('read', 'write', 'delete', 'manage')).pipe(
    Schema.minItems(1),
    Schema.maxItems(4)
  )),
  isActive: Schema.optional(Schema.Boolean),
  priority: Schema.optional(Schema.Number.pipe(
    Schema.int(),
    Schema.positive(),
    Schema.lessThanOrEqualTo(1000)
  )),
});

/**
 * AccessPolicy filter data transfer object schema
 * Fields for filtering and searching access policies
 * Uses field schemas where appropriate
 */
export const AccessPolicyFilterDTOSchema = Schema.Struct({
  subjectType: Schema.optional(Schema.Literal('user', 'role')),
  subjectId: Schema.optional(Schema.String.pipe(Schema.brand('SubjectId'))),
  resourceType: Schema.optional(Schema.Literal('document', 'user')),
  resourceId: Schema.optional(Schema.String.pipe(Schema.brand('ResourceId'))),
  actions: Schema.optional(Schema.Array(Schema.Literal('read', 'write', 'delete', 'manage'))),
  isActive: Schema.optional(Schema.Boolean),
  priority: Schema.optional(Schema.Number.pipe(Schema.positive())),
  search: Schema.optional(Schema.String), // Search in name, description
  createdAfter: Schema.optional(Schema.Date),
  createdBefore: Schema.optional(Schema.Date),
});

/**
 * AccessPolicy creation data transfer object type
 */
export type CreateAccessPolicyDTO = Schema.Schema.Type<typeof CreateAccessPolicyDTOSchema>;

/**
 * AccessPolicy update data transfer object type
 */
export type UpdateAccessPolicyDTO = Schema.Schema.Type<typeof UpdateAccessPolicyDTOSchema>;

/**
 * AccessPolicy filter data transfer object type
 */
export type AccessPolicyFilterDTO = Schema.Schema.Type<typeof AccessPolicyFilterDTOSchema>;

/**
 * AccessPolicy statistics schema
 */
export const AccessPolicyStatisticsSchema = Schema.Struct({
  total: Schema.Number.pipe(Schema.nonNegative()),
  bySubjectType: Schema.Record({ key: Schema.String, value: Schema.Number.pipe(Schema.nonNegative()) }),
  byResourceType: Schema.Record({ key: Schema.String, value: Schema.Number.pipe(Schema.nonNegative()) }),
  byAction: Schema.Record({ key: Schema.String, value: Schema.Number.pipe(Schema.nonNegative()) }),
  active: Schema.Number.pipe(Schema.nonNegative()),
  inactive: Schema.Number.pipe(Schema.nonNegative()),
});

/**
 * AccessPolicy statistics type
 */
export type AccessPolicyStatistics = Schema.Schema.Type<typeof AccessPolicyStatisticsSchema>;

/**
 * Derived schemas using pick and omit for specific use cases
 */

/**
 * AccessPolicy summary schema - only essential fields for listing
 */
export const AccessPolicySummarySchema = Schema.Struct({
  id: AccessPolicySchema.fields.id,
  name: AccessPolicySchema.fields.name,
  subjectType: AccessPolicySchema.fields.subjectType,
  subjectId: AccessPolicySchema.fields.subjectId,
  resourceType: AccessPolicySchema.fields.resourceType,
  resourceId: AccessPolicySchema.fields.resourceId,
  actions: AccessPolicySchema.fields.actions,
  isActive: AccessPolicySchema.fields.isActive,
  priority: AccessPolicySchema.fields.priority,
  createdAt: AccessPolicySchema.fields.createdAt,
});

/**
 * AccessPolicy rule schema - only rule-related fields
 */
export const AccessPolicyRuleSchema = Schema.Struct({
  id: AccessPolicySchema.fields.id,
  subjectType: AccessPolicySchema.fields.subjectType,
  subjectId: AccessPolicySchema.fields.subjectId,
  resourceType: AccessPolicySchema.fields.resourceType,
  resourceId: AccessPolicySchema.fields.resourceId,
  actions: AccessPolicySchema.fields.actions,
  priority: AccessPolicySchema.fields.priority,
});

/**
 * AccessPolicy audit schema - only audit fields
 */
export const AccessPolicyAuditSchema = Schema.Struct({
  id: AccessPolicySchema.fields.id,
  name: AccessPolicySchema.fields.name,
  isActive: AccessPolicySchema.fields.isActive,
  createdAt: AccessPolicySchema.fields.createdAt,
  updatedAt: AccessPolicySchema.fields.updatedAt,
});

/**
 * AccessPolicy creation input schema - omits system-generated fields
 */
export const AccessPolicyCreationInputSchema = Schema.Struct({
  name: AccessPolicySchema.fields.name,
  description: AccessPolicySchema.fields.description,
  subjectType: AccessPolicySchema.fields.subjectType,
  subjectId: AccessPolicySchema.fields.subjectId,
  resourceType: AccessPolicySchema.fields.resourceType,
  resourceId: AccessPolicySchema.fields.resourceId,
  actions: AccessPolicySchema.fields.actions,
  isActive: AccessPolicySchema.fields.isActive,
  priority: AccessPolicySchema.fields.priority,
});

/**
 * AccessPolicy update input schema - only updatable fields
 */
export const AccessPolicyUpdateInputSchema = Schema.Struct({
  name: AccessPolicySchema.fields.name,
  description: AccessPolicySchema.fields.description,
  subjectType: AccessPolicySchema.fields.subjectType,
  subjectId: AccessPolicySchema.fields.subjectId,
  resourceType: AccessPolicySchema.fields.resourceType,
  resourceId: AccessPolicySchema.fields.resourceId,
  actions: AccessPolicySchema.fields.actions,
  isActive: AccessPolicySchema.fields.isActive,
  priority: AccessPolicySchema.fields.priority,
});

/**
 * AccessPolicy search result schema - optimized for search results
 */
export const AccessPolicySearchResultSchema = Schema.Struct({
  id: AccessPolicySchema.fields.id,
  name: AccessPolicySchema.fields.name,
  subjectType: AccessPolicySchema.fields.subjectType,
  subjectId: AccessPolicySchema.fields.subjectId,
  resourceType: AccessPolicySchema.fields.resourceType,
  resourceId: AccessPolicySchema.fields.resourceId,
  actions: AccessPolicySchema.fields.actions,
  isActive: AccessPolicySchema.fields.isActive,
  priority: AccessPolicySchema.fields.priority,
  createdAt: AccessPolicySchema.fields.createdAt,
});

/**
 * Type exports for the derived schemas
 */
export type AccessPolicySummary = Schema.Schema.Type<typeof AccessPolicySummarySchema>;
export type AccessPolicyRule = Schema.Schema.Type<typeof AccessPolicyRuleSchema>;
export type AccessPolicyAudit = Schema.Schema.Type<typeof AccessPolicyAuditSchema>;
export type AccessPolicyCreationInput = Schema.Schema.Type<typeof AccessPolicyCreationInputSchema>;
export type AccessPolicyUpdateInput = Schema.Schema.Type<typeof AccessPolicyUpdateInputSchema>;
export type AccessPolicySearchResult = Schema.Schema.Type<typeof AccessPolicySearchResultSchema>;

/**
 * Effect-based AccessPolicy repository interface
 * Provides Effect-based operations for access policy management with proper validation
 */
export interface AccessPolicyRepository {
  /**
   * Create a new access policy with validation
   * @param {CreateAccessPolicyDTO} data - Access policy creation data
   * @returns {Effect.Effect<AccessPolicyEntity, ValidationError | DatabaseError>} Created access policy or error
   */
  create(data: CreateAccessPolicyDTO): Effect.Effect<AccessPolicyEntity, ValidationError | DatabaseError>;

  /**
   * Update an access policy with validation
   * @param {string} id - Access policy ID
   * @param {UpdateAccessPolicyDTO} data - Access policy update data
   * @returns {Effect.Effect<AccessPolicyEntity, ValidationError | NotFoundError | DatabaseError>} Updated access policy or error
   */
  update(id: string, data: UpdateAccessPolicyDTO): Effect.Effect<AccessPolicyEntity, ValidationError | NotFoundError | DatabaseError>;

  /**
   * Find an access policy by ID
   * @param {string} id - Access policy ID
   * @returns {Effect.Effect<AccessPolicyEntity | null, DatabaseError>} Access policy or null if not found
   */
  findById(id: string): Effect.Effect<AccessPolicyEntity | null, DatabaseError>;

  /**
   * Find all access policies with pagination
   * @param {PaginationParams} params - Pagination parameters
   * @returns {Effect.Effect<PaginatedResponse<AccessPolicyEntity>, DatabaseError>} Paginated access policies or error
   */
  findAll(params: PaginationParams): Effect.Effect<PaginatedResponse<AccessPolicyEntity>, DatabaseError>;

  /**
   * Delete an access policy by ID
   * @param {string} id - Access policy ID
   * @returns {Effect.Effect<boolean, DatabaseError>} Success or error
   */
  delete(id: string): Effect.Effect<boolean, DatabaseError>;

  /**
   * Find access policies by subject with validation
   * @param {string} subjectId - Subject ID to filter by
   * @param {'user' | 'role'} subjectType - Subject type to filter by
   * @returns {Effect.Effect<AccessPolicyEntity[], ValidationError | DatabaseError>} Array of access policies or error
   */
  findBySubject(subjectId: string, subjectType: 'user' | 'role'): Effect.Effect<AccessPolicyEntity[], ValidationError | DatabaseError>;

  /**
   * Find access policies by resource with validation
   * @param {string} resourceId - Resource ID to filter by
   * @param {'document' | 'user'} resourceType - Resource type to filter by
   * @returns {Effect.Effect<AccessPolicyEntity[], ValidationError | DatabaseError>} Array of access policies or error
   */
  findByResource(resourceId: string, resourceType: 'document' | 'user'): Effect.Effect<AccessPolicyEntity[], ValidationError | DatabaseError>;

  /**
   * Find access policies by action with validation
   * @param {string} action - Action to filter by
   * @returns {Effect.Effect<AccessPolicyEntity[], ValidationError | DatabaseError>} Array of access policies or error
   */
  findByAction(action: 'read' | 'write' | 'delete' | 'manage'): Effect.Effect<AccessPolicyEntity[], ValidationError | DatabaseError>;

  /**
   * Find active access policies
   * @returns {Effect.Effect<AccessPolicyEntity[], DatabaseError>} Array of active access policies or error
   */
  findActivePolicies(): Effect.Effect<AccessPolicyEntity[], DatabaseError>;

  /**
   * Find access policies by priority range with validation
   * @param {number} minPriority - Minimum priority
   * @param {number} maxPriority - Maximum priority
   * @returns {Effect.Effect<AccessPolicyEntity[], ValidationError | DatabaseError>} Array of access policies or error
   */
  findByPriorityRange(minPriority: number, maxPriority: number): Effect.Effect<AccessPolicyEntity[], ValidationError | DatabaseError>;

  /**
   * Find access policies created within date range with validation
   * @param {Date} startDate - Start date (inclusive)
   * @param {Date} endDate - End date (inclusive)
   * @returns {Effect.Effect<AccessPolicyEntity[], ValidationError | DatabaseError>} Array of access policies or error
   */
  findByCreatedDateRange(startDate: Date, endDate: Date): Effect.Effect<AccessPolicyEntity[], ValidationError | DatabaseError>;

  /**
   * Search access policies by name or description with validation
   * @param {string} searchTerm - Search term
   * @param {number} limit - Maximum number of results
   * @returns {Effect.Effect<AccessPolicyEntity[], ValidationError | DatabaseError>} Array of matching access policies or error
   */
  searchAccessPolicies(searchTerm: string, limit?: number): Effect.Effect<AccessPolicyEntity[], ValidationError | DatabaseError>;

  /**
   * Get access policy statistics with validation
   * @returns {Effect.Effect<AccessPolicyStatistics, DatabaseError>} Statistics or error
   */
  getStatistics(): Effect.Effect<AccessPolicyStatistics, DatabaseError>;

  /**
   * Find access policies by multiple IDs with validation
   * @param {string[]} policyIds - Array of access policy IDs
   * @returns {Effect.Effect<AccessPolicyEntity[], ValidationError | DatabaseError>} Array of access policies or error
   */
  findByIds(policyIds: string[]): Effect.Effect<AccessPolicyEntity[], ValidationError | DatabaseError>;

  /**
   * Check if access policy exists by ID
   * @param {string} policyId - Access policy unique identifier
   * @returns {Effect.Effect<boolean, DatabaseError>} True if access policy exists
   */
  existsById(policyId: string): Effect.Effect<boolean, DatabaseError>;

  /**
   * Deactivate access policy with validation
   * @param {string} policyId - Access policy unique identifier
   * @returns {Effect.Effect<AccessPolicyEntity, ValidationError | NotFoundError | DatabaseError>} Updated access policy or error
   */
  deactivatePolicy(policyId: string): Effect.Effect<AccessPolicyEntity, ValidationError | NotFoundError | DatabaseError>;

  /**
   * Activate access policy with validation
   * @param {string} policyId - Access policy unique identifier
   * @returns {Effect.Effect<AccessPolicyEntity, ValidationError | NotFoundError | DatabaseError>} Updated access policy or error
   */
  activatePolicy(policyId: string): Effect.Effect<AccessPolicyEntity, ValidationError | NotFoundError | DatabaseError>;

  /**
   * Find access policies that apply to a specific subject and resource
   * @param {string} subjectId - Subject ID
   * @param {'user' | 'role'} subjectType - Subject type
   * @param {string} resourceId - Resource ID
   * @param {'document' | 'user'} resourceType - Resource type
   * @returns {Effect.Effect<AccessPolicyEntity[], ValidationError | DatabaseError>} Array of applicable access policies or error
   */
  findApplicablePolicies(
    subjectId: string,
    subjectType: 'user' | 'role',
    resourceId: string,
    resourceType: 'document' | 'user'
  ): Effect.Effect<AccessPolicyEntity[], ValidationError | DatabaseError>;
}

/**
 * AccessPolicy repository validation utilities
 * Provides Effect-based validation functions using the schemas
 */
export const AccessPolicyRepositoryValidation = {
  /**
   * Validate create access policy data
   */
  validateCreate: (data: unknown) => 
    Schema.decodeUnknown(CreateAccessPolicyDTOSchema)(data),

  /**
   * Validate update access policy data
   */
  validateUpdate: (data: unknown) => 
    Schema.decodeUnknown(UpdateAccessPolicyDTOSchema)(data),

  /**
   * Validate filter access policy data
   */
  validateFilter: (data: unknown) => 
    Schema.decodeUnknown(AccessPolicyFilterDTOSchema)(data),

  /**
   * Validate access policy ID
   */
  validateAccessPolicyId: (id: unknown) => 
    Schema.decodeUnknown(Schema.String.pipe(Schema.brand('PolicyId')))(id),

  /**
   * Validate subject ID
   */
  validateSubjectId: (id: unknown) => 
    Schema.decodeUnknown(Schema.String.pipe(Schema.brand('SubjectId')))(id),

  /**
   * Validate resource ID
   */
  validateResourceId: (id: unknown) => 
    Schema.decodeUnknown(Schema.String.pipe(Schema.brand('ResourceId')))(id),

  /**
   * Validate access policy summary data
   */
  validateSummary: (data: unknown) => 
    Schema.decodeUnknown(AccessPolicySummarySchema)(data),

  /**
   * Validate access policy rule data
   */
  validateRule: (data: unknown) => 
    Schema.decodeUnknown(AccessPolicyRuleSchema)(data),

  /**
   * Validate access policy search result data
   */
  validateSearchResult: (data: unknown) => 
    Schema.decodeUnknown(AccessPolicySearchResultSchema)(data),
};

/**
 * AccessPolicy schema transformation utilities
 * Demonstrates advanced Effect Schema concepts
 */
export const AccessPolicySchemaUtils = {
  /**
   * Transform access policy to summary format
   */
  toSummary: (policy: AccessPolicyEntity) => 
    Schema.decodeUnknown(AccessPolicySummarySchema)(policy),

  /**
   * Transform access policy to search result format
   */
  toSearchResult: (policy: AccessPolicyEntity) => 
    Schema.decodeUnknown(AccessPolicySearchResultSchema)(policy),

  /**
   * Extract rule from access policy
   */
  extractRule: (policy: AccessPolicyEntity) => 
    Schema.decodeUnknown(AccessPolicyRuleSchema)(policy),

  /**
   * Extract audit information from access policy
   */
  extractAudit: (policy: AccessPolicyEntity) => 
    Schema.decodeUnknown(AccessPolicyAuditSchema)(policy),

  /**
   * Create a partial access policy from update data
   */
  createPartial: (updateData: UpdateAccessPolicyDTO) => 
    Schema.decodeUnknown(AccessPolicyUpdateInputSchema)(updateData),

  /**
   * Merge access policy with update data
   */
  mergeWithUpdate: (policy: AccessPolicyEntity, updateData: UpdateAccessPolicyDTO) => 
    Effect.gen(function* () {
      const partialUpdate = yield* Schema.decodeUnknown(AccessPolicyUpdateInputSchema)(updateData);
      // Return the merged data as a plain object
      // Note: In a real implementation, you would create a new AccessPolicyEntity
      return {
        ...policy,
        ...partialUpdate,
        updatedAt: new Date()
      };
    }),
};

/**
 * AccessPolicy schema composition utilities
 * Shows how to compose schemas for different use cases
 */
export const AccessPolicySchemaComposition = {
  /**
   * Create a schema for access policy with specific fields
   * Example usage: AccessPolicySchemaComposition.withFields(['id', 'name', 'actions'])
   */
  withFields: (fields: Array<keyof AccessPolicyEntity>) => {
    const fieldSchemas = fields.reduce((acc, field) => {
      if (field in AccessPolicySchema.fields) {
        acc[field] = (AccessPolicySchema.fields as any)[field];
      }
      return acc;
    }, {} as Record<string, any>);
    
    return Schema.Struct(fieldSchemas);
  },

  /**
   * Create a schema for access policy without specific fields
   * Example usage: AccessPolicySchemaComposition.withoutFields(['description', 'priority'])
   */
  withoutFields: (fieldsToOmit: Array<keyof AccessPolicyEntity>) => {
    const allFields = Object.keys(AccessPolicySchema.fields) as Array<keyof AccessPolicyEntity>;
    const remainingFields = allFields.filter(field => !fieldsToOmit.includes(field));
    
    const fieldSchemas = remainingFields.reduce((acc, field) => {
      if (field in AccessPolicySchema.fields) {
        acc[field] = (AccessPolicySchema.fields as any)[field];
      }
      return acc;
    }, {} as Record<string, any>);
    
    return Schema.Struct(fieldSchemas);
  },

  /**
   * Create a schema for access policy with additional validation
   * Example usage: AccessPolicySchemaComposition.withValidation(['name'], { name: Schema.String.pipe(Schema.minLength(5)) })
   */
  withValidation: (
    fields: Array<keyof AccessPolicyEntity>,
    validators: Partial<Record<keyof AccessPolicyEntity, Schema.Schema<any, any, never>>>
  ) => {
    const fieldSchemas = fields.reduce((acc, field) => {
      acc[field] = validators[field] || (AccessPolicySchema.fields as any)[field];
      return acc;
    }, {} as Record<string, any>);
    
    return Schema.Struct(fieldSchemas);
  },
};
