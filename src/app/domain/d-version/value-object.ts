import { Schema as S, Effect } from "effect"
import { ValidationError } from "@/app/domain/shared/base.errors"
import { DocumentVersionSchema } from "./schema"

/**
 * DocumentVersionData — immutable value object for validated file data
 */
export class DocumentVersionData {
  private constructor(private readonly data: S.Schema.Type<typeof DocumentVersionSchema>) {}

  static create(input: unknown): Effect.Effect<DocumentVersionData, ValidationError, never> {
    return S.decodeUnknown(DocumentVersionSchema)(input).pipe(
      Effect.map((value) => new DocumentVersionData(value)),
      Effect.mapError((err) => new ValidationError("Document version data invalid", "DocumentVersionData", { input, err }))
    )
  }

  /** Field accessors */
  get filename() { return this.data.filename }
  get mimeType() { return this.data.mimeType }
  get size() { return this.data.size }
  get storageKey() { return this.data.storageKey }
  get storageProvider() { return this.data.storageProvider }
  get checksum() { return this.data.checksum }
  get tags() { return this.data.tags }
  get metadata() { return this.data.metadata }

  /** Derived properties */
  get fileExtension(): string {
    const idx = this.data.filename.lastIndexOf(".")
    return idx !== -1 ? this.data.filename.substring(idx) : ""
  }

  get isImage(): boolean {
    return this.data.mimeType.startsWith("image/")
  }

  get isDocument(): boolean {
    return this.data.mimeType.startsWith("application/") || this.data.mimeType.startsWith("text/")
  }

  get sizeInMB(): number {
    return Math.round((this.data.size / 1024 / 1024) * 100) / 100
  }
}
