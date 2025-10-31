import "reflect-metadata"
import { inject, injectable } from "tsyringe"
import { Effect as E, Option as O, pipe, Schema as S } from "effect"
import crypto from "crypto"

import { SerializedDocument } from "@/app/domain/document/schema"
import { initializeEntityDefaults } from "@/app/domain/shared/schema.utils"
import { DocumentRepository } from "@/app/domain/document/repository"
import { DocumentSchemaEntity } from "@/app/domain/document/entity"
import { DocumentNotFoundError } from "@/app/domain/document/errors"
import { CreateDocumentDTOSchema, CreateDocumentDTOEncoded } from "@/app/application/dtos/document/create-doc.dto"
import { UpdateDocumentDTOSchema, UpdateDocumentDTOEncoded } from "@/app/application/dtos/document/update-doc.dto"
import { PublishDocumentDTOSchema, PublishDocumentDTOEncoded } from "@/app/application/dtos/document/publish-doc.dto"
import { QueryDocumentsDTOSchema, QueryDocumentsDTOEncoded } from "@/app/application/dtos/document/query-doc.dto"
import { TOKENS } from "@/app/infrastructure/di/tokens"
import { UserId, DocumentId } from "@/app/domain/refined/uuid"
import { PaginationOptions } from "@/app/domain/shared/pagination"
import { AccessControlService } from "@/app/application/services/access-control.service"
import { AuditLoggerService } from "@/app/application/services/audit-logger.service"
import { UserContext } from "@/presentation/http/orpc/auth"
import { withTiming } from "@/app/application/utils/timed-logger" 
import { withAppErrorBoundary } from "@/app/application/utils/application-error"

@injectable()
export class DocumentWorkflow {
  constructor(
    @inject(TOKENS.DOCUMENT_REPOSITORY)
    private readonly documentRepository: DocumentRepository,

    @inject(TOKENS.ACCESS_CONTROL_SERVICE)
    private readonly accessControlService: AccessControlService,

    @inject(TOKENS.AUDIT_LOGGER_SERVICE)
    private readonly auditLogger: AuditLoggerService
  ) {}

  createDocument(
    input: CreateDocumentDTOEncoded,
    user: UserContext
  ) {
    return withTiming("Document:createDocument", {
      correlationId: user.correlationId,
      userId: user.userId,
      workspaceId: user.workspaceId,
    }, async () => {
      return pipe(
        this.accessControlService.requirePermission(user, "document", "create", {
          resourceOwnerId: user.userId
        }),
        E.flatMap(() =>
          pipe(
            S.decodeUnknown(CreateDocumentDTOSchema)(input),
            E.flatMap((dto) =>
              DocumentSchemaEntity.create({
                ...dto,
                ownerId: user.userId,
                currentVersionId: crypto.randomUUID(),
                ...initializeEntityDefaults()
              } as SerializedDocument)
            ),
            // save the document to the database
            E.flatMap((entity) => this.documentRepository.save(entity)),
            E.tap((doc) =>
              this.auditLogger.logDocumentOperation(
                "document_created", doc.id, "create", user, "success",
                { title: (input as any).title }
              )),
            E.tapError((err) =>
              this.auditLogger.logDocumentOperation(
                "document_create_failed", "unknown","create", user, "failure", undefined, String(err)
              )))))})}

  updateDocument(
    input: UpdateDocumentDTOEncoded,
    user: UserContext
  ) {
    return withTiming("Document:updateDocument", {
      correlationId: user.correlationId,
      userId: user.userId,
      workspaceId: user.workspaceId,
    }, async () => {
      const eff = E.gen(function* (this: DocumentWorkflow) {
        const dto = yield* S.decodeUnknown(UpdateDocumentDTOSchema)(input)
        const validId = yield* S.decodeUnknown(DocumentId)(dto.id)
        const option = yield* this.documentRepository.findById(validId)
        if (O.isNone(option)) {
          return yield* E.fail(
            DocumentNotFoundError.forResource("Document", String(dto.id))
          )
        }
        const doc = option.value
        yield* this.accessControlService.requirePermission(user, "document", "update", {
          resourceOwnerId: doc.ownerId
        })
        const serialized = yield* doc.serialized()
        const updated = yield* DocumentSchemaEntity.create({
          ...serialized,
          ...dto,
          id: validId,
          updatedAt: new Date().toISOString()
        } as SerializedDocument)
        const saved = yield* this.documentRepository.save(updated)
        yield* this.auditLogger.logDocumentOperation(
          "document_updated", validId, "update", user, "success",
          { fields: Object.keys(dto) }
        )
        return saved
      }.bind(this))
      return withAppErrorBoundary(eff)
    })
  }

  publishDocument(
    input: PublishDocumentDTOEncoded,
    user: UserContext
  ) {
    return withTiming("Document:publishDocument", {
      correlationId: user.correlationId,
      userId: user.userId,
      workspaceId: user.workspaceId,
    }, async () => {
      const eff = E.gen(function* (this: DocumentWorkflow) {
        const dto = yield* S.decodeUnknown(PublishDocumentDTOSchema)(input)
        const option = yield* this.documentRepository.findById(dto.documentId)
        if (O.isNone(option)) {
          return yield* E.fail(
            DocumentNotFoundError.forResource("Document", String(dto.documentId)))
        }
        const doc = option.value
        yield* this.accessControlService.requirePermission(user, "document", "publish", {
          resourceOwnerId: doc.ownerId
        })
        const serialized = yield* doc.serialized()
        const updated = yield* DocumentSchemaEntity.create({
          ...serialized,
          updatedAt: new Date().toISOString()
        } as SerializedDocument)
        const saved = yield* this.documentRepository.save(updated)
        yield* this.auditLogger.logDocumentOperation(
          "document_published", dto.documentId, "publish", user, "success")
        return saved
      }.bind(this))
      return withAppErrorBoundary(eff)
    })
  }

  queryDocuments(
    input: QueryDocumentsDTOEncoded,
    user: UserContext
  ) {
    return withTiming("Document:queryDocuments", {
      correlationId: user.correlationId,
      userId: user.userId,
      workspaceId: user.workspaceId,
    }, async () => {
      return pipe(
        S.decodeUnknown(QueryDocumentsDTOSchema)(input),
        E.flatMap((dto) =>
          S.decodeUnknown(PaginationOptions)({page: dto.page ?? 1, // default page is 1
            limit: dto.limit ?? 10 // default limit is 10
          }).pipe(
            E.flatMap((pagination) => {
              const filter: { ownerId?: UserId; tags?: string[]; workspaceId?: string } = {
                tags: dto.tag ? [dto.tag] : undefined, // filter by tag if provided
                workspaceId: user.workspaceId // filter by workspace id
              }
              if (dto.ownerId) {
                return S.decodeUnknown(UserId)(dto.ownerId).pipe(
                  E.flatMap((ownerId) =>
                    this.documentRepository.findManyPaginated(pagination, {
                      ...filter, // filter by owner id if provided
                      ownerId
                    })))
              }
             return this.documentRepository.findManyPaginated(pagination, filter)
            }))))
    })}

  getDocumentById(
    id: string,
    user: UserContext
  ) {
    return withTiming("Document:getDocumentById", {
      correlationId: user.correlationId,
      userId: user.userId,
      workspaceId: user.workspaceId,
    }, async () => {
      return pipe(
        S.decodeUnknown(DocumentId)(id),
        E.flatMap((documentId) =>
          this.documentRepository.findById(documentId).pipe(
            E.flatMap((option) => O.isNone(option) ? E.fail( DocumentNotFoundError.forResource("Document", id)
          ): E.succeed(option.value)
          )))
      )})}
}
