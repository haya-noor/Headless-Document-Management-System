import { Schema as S } from "effect"
import { DownloadTokenId, DocumentId, UserId } from "@/app/domain/refined/uuid"
import { DownloadTokenString, ExpiryWindow } from "./value-object"
import { BaseEntitySchema } from "@/app/domain/shared/schema.utils"
import { Optional } from "@/app/domain/shared/validation.utils"

/** 
 * DownloadToken Schema
 * 
 * Domain model for a DownloadToken entity.
 * Uses S.extend to combine BaseEntitySchema with domain-specific fields.
 * 
 * Represents a secure, time-limited token for downloading documents.
 * Tokens can be used only once and expire after a specified time.
 */
export const DownloadTokenFields = S.Struct({
  token: DownloadTokenString,
  documentId: DocumentId,
  issuedTo: UserId,
  expiresAt: S.DateFromSelf,
  usedAt: Optional(S.DateFromSelf)
});

export const DownloadTokenSchema = S.extend(
  BaseEntitySchema(DownloadTokenId),
  DownloadTokenFields
)

/**
 * Runtime type with proper Option<T> handling for optional fields
 */
export type DownloadTokenType = S.Schema.Type<typeof DownloadTokenSchema>

/**
 * Serialized type for external APIs (DTOs, JSON responses)
 * Optional fields are represented as T | undefined in serialized form
 */
export type SerializedDownloadToken = S.Schema.Encoded<typeof DownloadTokenSchema>

/**
 * Smart constructor with validation
 * 
 * Validates and decodes unknown input into DownloadTokenType.
 * Returns Effect with validated data or ParseError.
 */
export const makeDownloadToken = (input: unknown) => S.decodeUnknown(DownloadTokenSchema)(input)

