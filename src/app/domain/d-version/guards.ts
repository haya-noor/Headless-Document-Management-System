import { Schema as S } from "effect"
import { ValidMimeType, FileKey, FileSize } from "@/app/domain/refined/metadata"
import { Sha256 } from "@/app/domain/refined/checksum"

/**
 * DocumentVersionGuards
 * — lightweight, domain-specific validation helpers
 */
export class DocumentVersionGuards {
  static readonly ValidVersion = S.Number.pipe(
    S.int(),
    S.filter((n) => n > 0, { message: () => "Version must be positive" })
  )

  static readonly ValidFilename = S.String.pipe(
    S.minLength(1),
    S.maxLength(255)
  )

  static readonly ValidMimeType = ValidMimeType
  static readonly ValidSize = FileSize
  static readonly ValidStorageKey = FileKey
  static readonly ValidChecksum = Sha256

  static readonly ValidTags = S.Array(S.String.pipe(S.minLength(1), S.maxLength(50))).pipe(
    S.filter((arr) => arr.length <= 20, { message: () => "Maximum 20 tags allowed" })
  )
}
