import "reflect-metadata"
import { inject, injectable } from "tsyringe"
import { Effect as E, Option as O, Schema as S } from "effect"

import { DocumentVersionRepository } from "@/app/domain/d-version/repository"
import { DocumentVersionEntity } from "@/app/domain/d-version/entity"
import { DocumentRepository } from "@/app/domain/document/repository"
import { TOKENS } from "@/app/infrastructure/di/tokens"
import { AccessControlService } from "@/app/application/services/access-control.service"
import { UserContext } from "@/presentation/http/orpc/auth"
import { withTiming } from "@/app/application/utils/timed-logger"
import { withAppErrorBoundary } from "@/app/application/utils/application-error"

import { ListVersionsDTOSchema, ListVersionsDTOEncoded } from "@/app/application/dtos/document-version/list-versions.dto"
import { GetVersionDTOSchema, GetVersionDTOEncoded } from "@/app/application/dtos/document-version/get-version.dto"
import { GetLatestVersionDTOSchema, GetLatestVersionDTOEncoded } from "@/app/application/dtos/document-version/get-latest-version.dto"

@injectable()
export class DocumentVersionWorkflow {
  constructor(
    @inject(TOKENS.DOCUMENT_VERSION_REPOSITORY)
    private readonly versionRepo: DocumentVersionRepository,

    @inject(TOKENS.DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,

    @inject(TOKENS.ACCESS_CONTROL_SERVICE)
    private readonly accessControl: AccessControlService
  ) {}

  /**
   * List all versions for a document
   */
  listVersions(
    input: ListVersionsDTOEncoded,
    user: UserContext
  ) {
    return withTiming("DocumentVersion:listVersions", {
      correlationId: user.correlationId,
      userId: user.userId,
      workspaceId: user.workspaceId,
    }, async () => {
      const eff = E.gen(function* (this: DocumentVersionWorkflow) {
        const dto = yield* S.decodeUnknown(ListVersionsDTOSchema)(input)

        // Ensure document exists and check permissions
        const docOpt = yield* this.documentRepo.findById(dto.documentId)
        if (O.isNone(docOpt)) {
          return yield* E.fail(new Error(`Document ${String(dto.documentId)} not found`))
        }

        const doc = docOpt.value

        // Check read permission on the document
        yield* this.accessControl.requirePermission(user, "document", "read", {
          resourceId: dto.documentId,
          resourceOwnerId: doc.ownerId
        })

        // Fetch all versions for the document
        const versions = yield* this.versionRepo.findByDocumentId(dto.documentId)

        return versions
      }.bind(this))
      return withAppErrorBoundary(eff)
    })
  }

  /**
   * Get a specific version of a document
   */
  getVersion(
    input: GetVersionDTOEncoded,
    user: UserContext
  ) {
    return withTiming("DocumentVersion:getVersion", {
      correlationId: user.correlationId,
      userId: user.userId,
      workspaceId: user.workspaceId,
    }, async () => {
      const eff = E.gen(function* (this: DocumentVersionWorkflow) {
        const dto = yield* S.decodeUnknown(GetVersionDTOSchema)(input)

        // Ensure document exists and check permissions
        const docOpt = yield* this.documentRepo.findById(dto.documentId)
        if (O.isNone(docOpt)) {
          return yield* E.fail(new Error(`Document ${String(dto.documentId)} not found`))
        }

        const doc = docOpt.value

        // Check read permission on the document
        yield* this.accessControl.requirePermission(user, "document", "read", {
          resourceId: dto.documentId,
          resourceOwnerId: doc.ownerId
        })

        // Fetch the specific version
        const versionOpt = yield* this.versionRepo.findByDocumentIdAndVersion(dto.documentId, dto.version)
        if (O.isNone(versionOpt)) {
          return yield* E.fail(new Error(`Version ${dto.version} not found for document ${String(dto.documentId)}`))
        }

        return versionOpt.value
      }.bind(this))
      return withAppErrorBoundary(eff)
    })
  }

  /**
   * Get the latest version of a document
   */
  getLatestVersion(
    input: GetLatestVersionDTOEncoded,
    user: UserContext
  ) {
    return withTiming("DocumentVersion:getLatestVersion", {
      correlationId: user.correlationId,
      userId: user.userId,
      workspaceId: user.workspaceId,
    }, async () => {
      const eff = E.gen(function* (this: DocumentVersionWorkflow) {
        const dto = yield* S.decodeUnknown(GetLatestVersionDTOSchema)(input)

        // Ensure document exists and check permissions
        const docOpt = yield* this.documentRepo.findById(dto.documentId)
        if (O.isNone(docOpt)) {
          return yield* E.fail(new Error(`Document ${String(dto.documentId)} not found`))
        }

        const doc = docOpt.value

        // Check read permission on the document
        yield* this.accessControl.requirePermission(user, "document", "read", {
          resourceId: dto.documentId,
          resourceOwnerId: doc.ownerId
        })

        // Fetch the latest version
        const versionOpt = yield* this.versionRepo.findLatestByDocumentId(dto.documentId)
        if (O.isNone(versionOpt)) {
          return yield* E.fail(new Error(`No versions found for document ${String(dto.documentId)}`))
        }

        return versionOpt.value
      }.bind(this))
      return withAppErrorBoundary(eff)
    })
  }
}

