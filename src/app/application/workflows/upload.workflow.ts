import "reflect-metadata"  // used by DI (dependency injection)
import { inject, injectable } from "tsyringe"
import { Effect as E, Option as O, pipe, Schema as S } from "effect"
import crypto from "crypto"

import { InitiateUploadDTOSchema, InitiateUploadDTOEncoded } from "@/app/application/dtos/upload/initiate-upload.dto"
import { ConfirmUploadDTOSchema, ConfirmUploadDTOEncoded } from "@/app/application/dtos/upload/confirm-upload.dto"

import { DocumentVersionRepository } from "@/app/domain/d-version/repository"
import { DocumentVersionEntity } from "@/app/domain/d-version/entity"
import { DocumentVersionAlreadyExistsError } from "@/app/domain/d-version/errors"
import { DocumentRepository } from "@/app/domain/document/repository"
import { TOKENS } from "@/app/infrastructure/di/tokens"
import { StorageServiceFactory } from "@/app/infrastructure/storage/storage.factory"

import { AccessControlService } from "@/app/application/services/access-control.service"
import { AuditLoggerService } from "@/app/application/services/audit-logger.service"

import { UserContext } from "@/presentation/http/orpc/auth"
import { withTiming } from "@/app/application/utils/timed-logger" 

@injectable()
export class UploadWorkflow {
  constructor(
    @inject(TOKENS.DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,

    @inject(TOKENS.DOCUMENT_VERSION_REPOSITORY)
    private readonly versionRepo: DocumentVersionRepository,

    @inject(TOKENS.STORAGE_SERVICE)
    private readonly storage: StorageServiceFactory,

    @inject(TOKENS.ACCESS_CONTROL_SERVICE)
    private readonly accessControl: AccessControlService,

    @inject(TOKENS.AUDIT_LOGGER_SERVICE)
    private readonly auditLogger: AuditLoggerService
  ) {}

  /**
   * Initiate Upload - returns a presigned URL
   */
  initiateUpload(
    input: InitiateUploadDTOEncoded,
    user: UserContext
  ) {
    return withTiming("Upload:initiateUpload", {
      correlationId: user.correlationId,
      userId: user.userId,
      workspaceId: user.workspaceId,
    }, async () => {
      return pipe(
        // validate input against schema
        S.decodeUnknown(InitiateUploadDTOSchema)(input),
        E.flatMap((dto) =>
          // enforce access control for upload on document resource 
          this.accessControl.enforceAccess(user, "document", "upload", {
            workspaceId: user.workspaceId
          }).pipe(
            E.flatMap(() =>
              E.promise(() =>
                // create presigned URL for the file
                StorageServiceFactory.getInstance().createPresignedUrl(
                  // unique storage key for the file
                  `${dto.documentId}/${dto.filename}`,
                  dto.mimeType
                )
              )
            )
          )
        )
      )
    })
  }

  /**
   * Confirm Upload - persist uploaded file as document version
   */
  confirmUpload(
    input: ConfirmUploadDTOEncoded,
    user: UserContext
  ) {
    return withTiming("Upload:confirmUpload", {
      correlationId: user.correlationId,
      userId: user.userId,
      workspaceId: user.workspaceId,
    }, async () => {
      return pipe(
        S.decodeUnknown(ConfirmUploadDTOSchema)(input),
        E.flatMap((dto) =>
          // enforce access control  
          this.accessControl.enforceAccess(user, "document", "upload", {
            workspaceId: user.workspaceId
          }).pipe(
            E.flatMap(() =>
              // check if a version with the same checksum already exists
              this.versionRepo.fetchByChecksum(dto.checksum as string).pipe(
                E.flatMap(
                  O.match({
                    onSome: () =>
                      // if a version with the same checksum already exists, return an error
                      E.fail(
                        DocumentVersionAlreadyExistsError.forField("checksum", dto.checksum)
                      ),
                    onNone: () =>
                      // if a version with the same checksum does not exist, create a new version
                      DocumentVersionEntity.create({
                        id: crypto.randomUUID(),
                        documentId: dto.documentId,
                        version: 1,
                        
                        filename: dto.storageKey.split("/").pop() || "unknown",
                        checksum: dto.checksum,
                        storageKey: dto.storageKey,
                        storageProvider: "local",
                        mimeType: dto.mimeType,
                        size: dto.size,
                        uploadedBy: dto.userId,
                        createdAt: new Date().toISOString()
                      }).pipe(
                        E.flatMap((v) => this.versionRepo.save(v)),
                        // Audit success
                        E.tap((saved) =>
                          this.auditLogger.logDocumentOperation(
                            "document_version_created",
                            saved.documentId,
                            "upload",
                            user,
                            "success",
                            { versionId: saved.id }
                          )
                        ),
                        // Audit failure if any error occurs while creating the version
                        E.tapError((err) =>
                          this.auditLogger.logDocumentOperation(
                            "document_version_create_failed",
                            dto.documentId,
                            "upload",
                            user,
                            "failure",
                            undefined,
                            String(err)
                          )
                        )
                      )
                  })
                )
              )
            )
          )
        )
      )
    })
  }
}
