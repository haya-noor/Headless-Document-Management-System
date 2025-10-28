import { Option } from "effect"

/**
 * Presentation Layer Utilities
 * 
 * Shared helper functions for normalizing workflow responses to RPC format.
 * These utilities handle common transformations between application layer
 * (Effect with Options, branded types) and presentation layer (plain JSON).
 */

/**
 * Normalize Option<T> to T | null for JSON serialization
 */
export function normalizeOption<T>(option: Option.Option<T>): T | null {
  return Option.match(option, {
    onNone: () => null,
    onSome: (value) => value
  })
}

/**
 * Normalize Option<T> to T | undefined for JSON serialization
 */
export function normalizeOptionToUndefined<T>(option: Option.Option<T>): T | undefined {
  return Option.match(option, {
    onNone: () => undefined,
    onSome: (value) => value
  })
}

/**
 * Normalize updatedAt field from string | null to string | undefined
 */
export function normalizeUpdatedAt<T extends { updatedAt?: string | null | undefined }>(
  result: T
): T & { updatedAt?: string | undefined } {
  return {
    ...result,
    updatedAt: result.updatedAt ?? undefined
  }
}

/**
 * Normalize document response with optional fields
 */
export function normalizeDocumentResponse<T extends {
  description?: Option.Option<string> | string | null | undefined;
  tags?: Option.Option<string[]> | Option.Option<readonly string[]> | string[] | readonly string[] | null | undefined;
  workspaceId?: Option.Option<string> | string | null | undefined;
  updatedAt?: string | null | undefined;
}>(
  result: T
): T & {
  description?: string | undefined;
  tags?: string[] | undefined;
  workspaceId?: string | undefined;
  updatedAt?: string | undefined;
} {
  const description = result.description
    ? (Option.isOption(result.description)
        ? normalizeOptionToUndefined(result.description)
        : result.description ?? undefined)
    : undefined

  const tags = result.tags
    ? (Option.isOption(result.tags)
        ? normalizeOptionToUndefined(result.tags)
        : Array.isArray(result.tags) 
          ? [...result.tags] // Convert readonly array to mutable array
          : result.tags ?? undefined)
    : undefined

  const workspaceId = result.workspaceId
    ? (Option.isOption(result.workspaceId)
        ? normalizeOptionToUndefined(result.workspaceId)
        : result.workspaceId ?? undefined)
    : undefined

  return {
    ...result,
    description,
    tags: tags as string[] | undefined,
    workspaceId,
    updatedAt: result.updatedAt ?? undefined
  }
}

/**
 * Normalize user response with optional fields
 */
export function normalizeUserResponse<T extends {
  workspaceId?: Option.Option<string> | string | null | undefined;
  dateOfBirth?: Option.Option<string> | string | null | undefined;
  phoneNumber?: Option.Option<string> | string | null | undefined;
  profileImage?: Option.Option<string> | string | null | undefined;
  updatedAt?: string | null | undefined;
}>(
  result: T
): T & {
  workspaceId?: string | undefined;
  dateOfBirth?: string | undefined;
  phoneNumber?: string | undefined;
  profileImage?: string | undefined;
  updatedAt?: string | undefined;
} {
  const workspaceId = result.workspaceId
    ? (Option.isOption(result.workspaceId)
        ? normalizeOptionToUndefined(result.workspaceId)
        : result.workspaceId ?? undefined)
    : undefined

  const dateOfBirth = result.dateOfBirth
    ? (Option.isOption(result.dateOfBirth)
        ? normalizeOptionToUndefined(result.dateOfBirth)
        : result.dateOfBirth ?? undefined)
    : undefined

  const phoneNumber = result.phoneNumber
    ? (Option.isOption(result.phoneNumber)
        ? normalizeOptionToUndefined(result.phoneNumber)
        : result.phoneNumber ?? undefined)
    : undefined

  const profileImage = result.profileImage
    ? (Option.isOption(result.profileImage)
        ? normalizeOptionToUndefined(result.profileImage)
        : result.profileImage ?? undefined)
    : undefined

  return {
    ...result,
    workspaceId,
    dateOfBirth,
    phoneNumber,
    profileImage,
    updatedAt: result.updatedAt ?? undefined
  }
}

/**
 * Normalize download token response
 */
export function normalizeDownloadTokenResponse<T extends {
  usedAt?: Option.Option<string> | string | null | undefined;
  updatedAt?: string | null | undefined;
}>(
  result: T
): T & {
  usedAt?: string | undefined;
  updatedAt?: string | undefined;
} {
  const usedAt = result.usedAt
    ? (Option.isOption(result.usedAt)
        ? normalizeOptionToUndefined(result.usedAt)
        : result.usedAt ?? undefined)
    : undefined

  return {
    ...result,
    usedAt,
    updatedAt: result.updatedAt ?? undefined
  }
}

/**
 * Normalize paginated response
 */
export function normalizePaginatedResponse<T>(
  result: {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }
) {
  return {
    data: result.data,
    pagination: {
      page: result.pagination.page,
      limit: result.pagination.limit,
      total: result.pagination.total,
      totalPages: result.pagination.totalPages
    }
  }
}
