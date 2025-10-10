/**
 * AccessPolicy domain guards
 * Provides validation and type guards for access policy operations
 */

import { Schema } from '@effect/schema';
import { Effect } from 'effect';
import { PolicyIdVO } from './id';
import { DateTimeVO } from '../shared/date-time';
import { AccessPolicyValidationError } from './errors';
import { PermissionAction } from './entity';

/**
 * Policy name schema
 */
export const PolicyNameSchema = Schema.String.pipe(
  Schema.minLength(1),
  Schema.maxLength(255)
);

export type PolicyName = Schema.Schema.Type<typeof PolicyNameSchema>;

/**
 * Policy description schema
 */
export const PolicyDescriptionSchema = Schema.String.pipe(
  Schema.maxLength(1000)
);

export type PolicyDescription = Schema.Schema.Type<typeof PolicyDescriptionSchema>;

/**
 * Subject(user or role) ID schema
 * explain the pattern, what the regex is doing
 * ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
 * The regex pattern is used to validate that the subject ID is a valid UUID.
 * The ^ character asserts the position at the start of the string.
 * [0-9a-f] matches any hexadecimal digit (0-9 or a-f).
 * {8} matches exactly 8 occurrences of the preceding character.
 * - matches a literal hyphen.
 * {4} matches exactly 4 occurrences of the preceding character.
 * {4} matches exactly 4 occurrences of the preceding character.
 * {4} matches exactly 4 occurrences of the preceding character.
 * {12} matches exactly 12 occurrences of the preceding character.
 * $ character asserts the position at the end of the string.
 * /i makes the regex case-insensitive.
 */
export const SubjectIdSchema = Schema.String.pipe(
  Schema.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  Schema.brand('SubjectId')
);

export type SubjectId = Schema.Schema.Type<typeof SubjectIdSchema>;

/**
 * Resource (document or user) ID schema
 */
export const ResourceIdSchema = Schema.String.pipe(
  Schema.pattern(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  Schema.brand('ResourceId')
);

export type ResourceId = Schema.Schema.Type<typeof ResourceIdSchema>;

/**
 * Permission action schema
 */
export const PermissionActionSchema = Schema.Literal('read', 'write', 'delete', 'manage');

/**
 * Subject type schema
 */
export const SubjectTypeSchema = Schema.Literal('user', 'role');

export type SubjectType = Schema.Schema.Type<typeof SubjectTypeSchema>;

/**
 * Resource type schema
 */
export const ResourceTypeSchema = Schema.Literal('document', 'user');

export type ResourceType = Schema.Schema.Type<typeof ResourceTypeSchema>;

/**
 * Policy priority schema
 */
export const PolicyPrioritySchema = Schema.Number.pipe(
  Schema.int(),
  Schema.positive()
);

export type PolicyPriority = Schema.Schema.Type<typeof PolicyPrioritySchema>;

/**
 * Guard functions for access policy validation
 */
export const AccessPolicyGuards = {
  /**
   * Validate policy ID
   * policy id: it is a UUID,used to identify the policy in the database,API,UI,code
   * why would we want to validate the policy id?
   * to ensure that the policy id is not null, undefined, empty, a string, a number
   */
  isValidPolicyId: (value: unknown): Effect.Effect<PolicyIdVO, AccessPolicyValidationError, never> => {
    return PolicyIdVO.fromUnknown(value).pipe(
      Effect.mapError(() => new AccessPolicyValidationError({
        field: 'id',
        value,
        message: 'Invalid policy ID format'
      }))
    );
  },

  /**
   * Validate policy name
   */
  isValidPolicyName: (value: unknown): Effect.Effect<PolicyName, AccessPolicyValidationError, never> => {
    return Schema.decodeUnknown(PolicyNameSchema)(value).pipe(
      Effect.mapError(() => new AccessPolicyValidationError({
        field: 'name',
        value,
        message: 'Invalid policy name format'
      }))
    );
  },

  /**
   * Validate policy description
   */
  isValidPolicyDescription: (value: unknown): Effect.Effect<PolicyDescription, AccessPolicyValidationError, never> => {
    return Schema.decodeUnknown(PolicyDescriptionSchema)(value).pipe(
      Effect.mapError(() => new AccessPolicyValidationError({
        field: 'description',
        value,
        message: 'Invalid policy description format'
      }))
    );
  },

  /**
   * Validate subject ID
   */
  isValidSubjectId: (value: unknown): Effect.Effect<SubjectId, AccessPolicyValidationError, never> => {
    return Schema.decodeUnknown(SubjectIdSchema)(value).pipe(
      Effect.mapError(() => new AccessPolicyValidationError({
        field: 'subjectId',
        value,
        message: 'Invalid subject ID format'
      }))
    );
  },

  /**
   * Validate resource ID
   */
  isValidResourceId: (value: unknown): Effect.Effect<ResourceId, AccessPolicyValidationError, never> => {
    return Schema.decodeUnknown(ResourceIdSchema)(value).pipe(
      Effect.mapError(() => new AccessPolicyValidationError({
        field: 'resourceId',
        value,
        message: 'Invalid resource ID format'
      }))
    );
  },

  /**
   * Validate permission action
   */
  isValidPermissionAction: (value: unknown): Effect.Effect<PermissionAction, AccessPolicyValidationError, never> => {
    return Schema.decodeUnknown(PermissionActionSchema)(value).pipe(
      Effect.map(action => action as PermissionAction),
      Effect.mapError(() => new AccessPolicyValidationError({
        field: 'action',
        value,
        message: 'Invalid permission action format'
      }))
    );
  },

  /**
   * Validate subject(user or role) type
   */
  isValidSubjectType: (value: unknown): Effect.Effect<SubjectType, AccessPolicyValidationError, never> => {
    return Schema.decodeUnknown(SubjectTypeSchema)(value).pipe(
      Effect.mapError(() => new AccessPolicyValidationError({
        field: 'subjectType',
        value,
        message: 'Invalid subject type format'
      }))
    );
  },

  /**
   * Validate resource type
   */
  isValidResourceType: (value: unknown): Effect.Effect<ResourceType, AccessPolicyValidationError, never> => {
    return Schema.decodeUnknown(ResourceTypeSchema)(value).pipe(
      Effect.mapError(() => new AccessPolicyValidationError({
        field: 'resourceType',
        value,
        message: 'Invalid resource type format'
      }))
    );
  },

  /**
   * Validate policy priority
   */
  isValidPolicyPriority: (value: unknown): Effect.Effect<PolicyPriority, AccessPolicyValidationError, never> => {
    return Schema.decodeUnknown(PolicyPrioritySchema)(value).pipe(
      Effect.mapError(() => new AccessPolicyValidationError({
        field: 'priority',
        value,
        message: 'Invalid policy priority format'
      }))
    );
  },

  /**
   * Validate date time
   */
  isValidDateTime: (value: unknown): Effect.Effect<DateTimeVO, AccessPolicyValidationError, never> => {
    return DateTimeVO.fromUnknown(value).pipe(
      Effect.mapError(() => new AccessPolicyValidationError({
        field: 'dateTime',
        value,
        message: 'Invalid date time format'
      }))
    );
  },

  /**
   * Check if policy is active
   */
  isPolicyActive: (isActive: boolean): boolean => {
    return isActive;
  },

  /**
   * Check if policy has higher priority
   * 
   */
  hasHigherPriority: (priority1: number, priority2: number): boolean => {
    return priority1 < priority2; // Lower number = higher priority
  },

  /**
   * Validate actions array
   */
  isValidActions: (value: unknown): Effect.Effect<string[], AccessPolicyValidationError, never> => {
    return Schema.decodeUnknown(Schema.Array(PermissionActionSchema))(value).pipe(
      Effect.map(actions => actions as string[]),
      Effect.mapError(() => new AccessPolicyValidationError({
        field: 'actions',
        value,
        message: 'Invalid actions format'
      }))
    );
  },
};
