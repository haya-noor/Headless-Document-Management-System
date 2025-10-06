/**
 * User domain entity
 * Represents a user with role-based access control
 */

import { Schema } from '@effect/schema';
import { Effect } from 'effect';
import { UserIdVO, DateTimeVO } from '../value-objects';

/**
 * User role enumeration for RBAC
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

/**
 * User entity schema
 * Defines the structure and validation rules for a user
 */
export const UserSchema = Schema.Struct({
  id: Schema.String.pipe(Schema.brand('UserId')),
  email: Schema.String.pipe(
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    Schema.maxLength(255)
  ),
  firstName: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(100)
  ),
  lastName: Schema.String.pipe(
    Schema.minLength(1),
    Schema.maxLength(100)
  ),
  role: Schema.Literal('admin', 'user'),
  isActive: Schema.Boolean,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
});

export type User = Schema.Schema.Type<typeof UserSchema>;


function createUserId(id: string): UserIdVO {
  return Effect.runSync(UserIdVO.fromString(id));
}

/*
Convert an existing Date (from database or API) to DateTimeVO
used in the fromPersistence method
*/
function createDateTime(date: Date): DateTimeVO {
  return Effect.runSync(DateTimeVO.fromDate(date));
}

/*
Gets the current timestamp as a DateTimeVO
used in the create(), deactivate(), activate() methods
*/
function createCurrentDateTime(): DateTimeVO {
  return Effect.runSync(DateTimeVO.now());
}

/**
 * User entity class
 * Encapsulates business logic and invariants(like no two users can have the same email etc)
 */

// readonly ensures immutability 
export class UserEntity {
  public readonly id: UserIdVO;
  public readonly email: string;
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly role: UserRole;
  public readonly isActive: boolean;
  public readonly createdAt: DateTimeVO;
  public readonly updatedAt: DateTimeVO;

  /**
   * Private constructor - use static factory methods
   */
  private constructor(props: {
    id: UserIdVO;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    createdAt: DateTimeVO;
    updatedAt: DateTimeVO;
  }) {
    this.id = props.id;
    this.email = props.email;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.role = props.role;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Create a new user
   */
  static create(props: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  }): UserEntity {
    const now = createCurrentDateTime();
    
    return new UserEntity({
      id: createUserId(props.id),
      email: props.email,
      firstName: props.firstName,
      lastName: props.lastName,
      role: props.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Create user from persistence data
   */
  static fromPersistence(data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): UserEntity {
    return new UserEntity({
      id: createUserId(data.id),
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role as UserRole,
      isActive: data.isActive,
      createdAt: createDateTime(data.createdAt),
      updatedAt: createDateTime(data.updatedAt),
    });
  }

  /**
   * Convert to persistence format
   */
  toPersistence(): {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id.getValue(),
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt.getValue(),
      updatedAt: this.updatedAt.getValue(),
    };
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /**
   * Deactivate user
   */
  deactivate(): UserEntity {
    return new UserEntity({
      ...this,
      isActive: false,
      updatedAt: createCurrentDateTime(),
    });
  }

  /**
   * Activate user
   * ...this is a mutator method, which mutates the state of the object
   * by mutating the state of the object, it returns a new object with the updated state
   */
  activate(): UserEntity {
    return new UserEntity({
      ...this,
      isActive: true,
      updatedAt: createCurrentDateTime(),
    });
  }

  /**
   * Get full name
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
