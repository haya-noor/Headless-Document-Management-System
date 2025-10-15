import { Schema as S, Option } from "effect"
import { DateFromSelf } from "@effect/schema/DateFromSelf"
import { DownloadTokenId, DocumentId, UserId } from "../shared/uuid"
import { BaseEntitySchema } from "../shared/base.entity"
import { Optional } from "../shared/schema.utils"
import { DownloadTokenString } from "./value-object"
import { ExpiryWindow } from "./value-object"

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
    expiresAt: ExpiryWindow()(DateFromSelf),
    usedAt: Optional(DateFromSelf)
  })
)

export type DownloadTokenType = S.Schema.Type<typeof DownloadTokenSchema>
export type SerializedDownloadToken = S.Schema.Encoded<typeof DownloadTokenSchema>
