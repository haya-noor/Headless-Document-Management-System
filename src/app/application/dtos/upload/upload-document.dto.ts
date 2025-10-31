import { Schema as S } from "effect"
import { DocumentId, UserId } from "@/app/domain/refined/uuid"

/**
 * UploadDocument DTO Schema
 * 
 * For file upload via FormData (multipart/form-data).
 * Client sends:
 *   - "file": File object (from <input type="file">)
 *   - "documentId": string
 * 
 * The file metadata (filename, mimeType) is extracted from the File object.
 */
export const UploadDocumentDTOSchema = S.Struct({
  documentId: DocumentId,
  userId: UserId,
})
export type UploadDocumentDTO = S.Schema.Type<typeof UploadDocumentDTOSchema>
export type UploadDocumentDTOEncoded = S.Schema.Encoded<typeof UploadDocumentDTOSchema>

