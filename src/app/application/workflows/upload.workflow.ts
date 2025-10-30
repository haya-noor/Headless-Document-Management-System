import "reflect-metadata"
import { inject, injectable } from "tsyringe"
import { Effect as E, Option as O, pipe, Schema as S } from "effect"
import crypto from "crypto"
import { InitiateUploadDTOSchema, InitiateUploadDTOEncoded } from "@/app/application/dtos/upload/initiate-upload.dto"
import { ConfirmUploadDTOSchema, ConfirmUploadDTOEncoded } from "@/app/application/dtos/upload/confirm-upload.dto"
import { DocumentVersionRepository } from "@/app/domain/d-version/repository"
import { StorageServiceFactory } from "@/app/infrastructure/storage/storage.factory"
import { TOKENS } from "@/app/infrastructure/di/container"
import { DocumentRepository } from "@/app/domain/document/repository"
import { DocumentVersionEntity } from "@/app/domain/d-version/entity"
import { DocumentVersionAlreadyExistsError } from "@/app/domain/d-version/errors"

@injectable()
export class UploadWorkflow {
  constructor(
    @inject(TOKENS.DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,
    @inject(TOKENS.DOCUMENT_VERSION_REPOSITORY)
    private readonly versionRepo: DocumentVersionRepository,
    @inject(TOKENS.STORAGE_SERVICE)
    private readonly storage: StorageServiceFactory
  ) {}

  /**
   * Initiate Upload - return presigned URL(a temporary url that allows user to upload or 
   * download a file from storage without neddeding authentication, it expires after a
   *  certain time)
   */
  initiateUpload(input: InitiateUploadDTOEncoded) {
    return pipe(
      S.decodeUnknown(InitiateUploadDTOSchema)(input),
      E.flatMap((dto) =>
        E.promise(() => StorageServiceFactory.getInstance().createPresignedUrl(
          `${dto.documentId}/${dto.filename}`,
          dto.mimeType
        ))
      )
    )
  }

  /**
   * Confirm Upload - idempotent( means that the operation can be performed multiple times without 
   * changing the result) persistence of version
   * 
   * fetchByChecksum: fetches a version by its checksum(a unique identifier for the version)
   * doesn't allow duplicate versions to be created 
   */
  confirmUpload(input: ConfirmUploadDTOEncoded) {
    return pipe(
      // validate incoming data against the schema
      S.decodeUnknown(ConfirmUploadDTOSchema)(input),
      // check if file data already exists in storage
      E.flatMap((dto) =>
        // Step 1: prevent duplicates by checksum
        this.versionRepo.fetchByChecksum(dto.checksum as string).pipe(
          E.flatMap(O.match({
            onSome: () => E.fail(DocumentVersionAlreadyExistsError.forField("checksum", dto.checksum)),
            onNone: () =>
              // Step 2: ensure document exists and compute next version number
              this.documentRepo.findById(dto.documentId).pipe(
                E.flatMap(O.match({
                  onNone: () => E.fail(new Error(`Document ${String(dto.documentId)} not found`)),
                  onSome: (document) =>
                    this.versionRepo.getNextVersionNumber(dto.documentId).pipe(
                      E.flatMap((nextVersion) =>
                        // Step 3: create and persist the new immutable version
                        DocumentVersionEntity.create({
                          id: crypto.randomUUID(),
                          documentId: dto.documentId,
                          version: nextVersion,
                          filename: dto.storageKey.split('/').pop() || 'unknown',
                          checksum: dto.checksum,
                          storageKey: dto.storageKey,
                          storageProvider: "local",
                          mimeType: dto.mimeType,
                          size: dto.size,
                          uploadedBy: dto.userId,
                          createdAt: new Date().toISOString()
                        }).pipe(
                          E.flatMap((versionEntity) =>
                            this.versionRepo.save(versionEntity).pipe(
                              // Step 4: update document's currentVersionId to the new version (aggregate coordination)
                              E.flatMap((savedVersion) =>
                                document.serialized().pipe(
                                  E.flatMap((serializedDoc) =>
                                    DocumentSchemaEntity.create({
                                      ...serializedDoc,
                                      currentVersionId: savedVersion.id,
                                      updatedAt: new Date().toISOString()
                                    })
                                  ),
                                  E.flatMap((updatedDoc) => this.documentRepo.save(updatedDoc)),
                                  E.map(() => savedVersion)
                                )
                              )
                            )
                          )
                        )
                      )
                    )
                }))
              )
          }))
        )
      )
    )
  }
}
