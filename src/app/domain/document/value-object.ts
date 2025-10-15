import { Schema as S, Effect } from "effect"
import { ValidationError } from "../shared/errors"
import { FileSize, AllowedMimeType, ValidMimeType, makeFileSizeSync } from "../shared/metadata"

/** Schema for file upload validation */
export const FileUploadSchema = S.Struct({
  originalName: S.String.pipe(
    S.minLength(1),
    S.maxLength(255)
  ),
  mimeType: S.String.pipe(ValidMimeType),
  size: S.Number.pipe(S.filter((n) => n > 0 && n <= 50 * 1024 * 1024, { message: () => "File size out of range" })),
  data: S.instanceOf(Buffer)
})
export type FileUploadSchema = S.Schema.Type<typeof FileUploadSchema>

/**
 * FileUpload — immutable validated VO for file uploads
 */
export class FileUpload {
  private constructor(
    private readonly originalNameValue: string,
    private readonly mimeTypeValue: AllowedMimeType,
    private readonly sizeValue: FileSize,
    private readonly dataValue: Buffer
  ) {}

  static create(
    originalName: string,
    mimeType: string,
    size: number,
    data: Buffer
  ): Effect.Effect<FileUpload, ValidationError, never> {
    return S.decodeUnknown(FileUploadSchema)({ originalName, mimeType, size, data }).pipe(
      Effect.map((validated) =>
        new FileUpload(
          FileUpload.sanitizeFileName(validated.originalName),
          validated.mimeType as AllowedMimeType,
          makeFileSizeSync(validated.size),
          validated.data
        )
      ),
      Effect.mapError((err) => new ValidationError("File upload invalid", "FileUpload.create", { err, originalName }))
    )
  }

  /** Safe file name sanitization */
  private static sanitizeFileName(name: string): string {
    return name.trim().replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "_").slice(0, 255)
  }

  /** Accessors */
  get originalName() { return this.originalNameValue }
  get mimeType() { return this.mimeTypeValue }
  get size() { return this.sizeValue }
  get data() { return this.dataValue }
  get sanitizedName() { return FileUpload.sanitizeFileName(this.originalNameValue) }
  get fileExtension() { const i = this.originalNameValue.lastIndexOf("."); return i !== -1 ? this.originalNameValue.slice(i) : "" }
  get isImage() { return this.mimeTypeValue.startsWith("image/") }
  get isDocument() { return this.mimeTypeValue.startsWith("application/") || this.mimeTypeValue.startsWith("text/") }

  toData() {
    return { originalName: this.originalNameValue, mimeType: this.mimeTypeValue, size: this.sizeValue, data: this.dataValue }
  }
}
