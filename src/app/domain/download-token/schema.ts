import { Schema as S, Option } from "effect"
import { DownloadTokenId, DocumentId, UserId } from "@/app/domain/shared/uuid"
import { BaseEntitySchema, Optional } from "@/app/domain/shared/schema.utils"
import { DownloadTokenString } from "./value-object"
import { ExpiryWindow } from "./value-object"

/**
 * Schema for Option<Date> that converts between string | undefined and Option<Date>
 */
const OptionDateSchema = S.optional(S.DateFromString)

/**
 * DownloadToken Schema
 * Defines the structure and validation rules for the DownloadToken entity.
 * Derived from Effect Schema to enforce domain-level invariants.
 */
export const DownloadTokenSchema = S.extend(
  BaseEntitySchema(DownloadTokenId),
  S.Struct({
    token: DownloadTokenString,
    documentId: DocumentId,
    issuedTo: UserId,
    expiresAt: ExpiryWindow()(S.DateFromString),
    usedAt: OptionDateSchema
  })
)

export type DownloadTokenType = S.Schema.Type<typeof DownloadTokenSchema>
export type SerializedDownloadToken = S.Schema.Encoded<typeof DownloadTokenSchema>
