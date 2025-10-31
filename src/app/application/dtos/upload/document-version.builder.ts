import { Schema as S, Effect as E } from "effect"
import crypto from "crypto"

import { ConfirmUploadDTOSchema, ConfirmUploadDTO } from "@/app/application/dtos/upload/confirm-upload.dto"
import { DocumentVersionEntity } from "@/app/domain/d-version/entity"

/**
 * Builder for constructing a DocumentVersionEntity in steps.
 * Helps avoid long parameter lists and makes the construction readable.
 */
export class DocumentVersionBuilder {
  private draft: Partial<S.Schema.Type<typeof ConfirmUploadDTOSchema>> & {
    version?: number
  } = {}

  setFromConfirmDTO(dto: ConfirmUploadDTO) {
    this.draft.documentId = dto.documentId
    this.draft.mimeType = dto.mimeType
    this.draft.size = dto.size
    this.draft.storageKey = dto.storageKey
    this.draft.checksum = dto.checksum
    this.draft.userId = dto.userId
    // filename from storageKey
    const last = dto.storageKey.split("/").pop() || "unknown"
    ;(this.draft as any).filename = last
    ;(this.draft as any).storageProvider = "local"
    return this
  }

  setFromUploadData(data: {
    documentId: string
    filename: string
    mimeType: string
    size: number
    storageKey: string
    checksum: string
    uploadedBy: string
  }) {
    this.draft.documentId = data.documentId
    ;(this.draft as any).filename = data.filename
    this.draft.mimeType = data.mimeType as any
    this.draft.size = data.size as any
    this.draft.storageKey = data.storageKey as any
    this.draft.checksum = data.checksum as any
    this.draft.userId = data.uploadedBy as any
    ;(this.draft as any).storageProvider = "local"
    return this
  }

  setVersion(version: number) {
    this.draft.version = version
    return this
  }

  buildEntity() {
    const nowIso = new Date().toISOString()
    return DocumentVersionEntity.create({
      id: crypto.randomUUID(),
      documentId: this.draft.documentId!,
      version: this.draft.version ?? 1,
      filename: (this.draft as any).filename,
      checksum: this.draft.checksum as any,
      storageKey: this.draft.storageKey as any,
      storageProvider: "local",
      mimeType: this.draft.mimeType as any,
      size: this.draft.size as any,
      uploadedBy: this.draft.userId as any,
      createdAt: nowIso
    })
  }
}


