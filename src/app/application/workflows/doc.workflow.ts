import "reflect-metadata"
import { inject, injectable } from "tsyringe"
import { DateTime, Effect as E, Option as O, pipe, Schema as S, ParseResult } from "effect"
import crypto from "crypto"

import { DocumentSchema, SerializedDocument } from "@/app/domain/document/schema"
import { DocumentRepository } from "@/app/domain/document/repository"
import { DocumentSchemaEntity } from "@/app/domain/document/entity"
import { DocumentNotFoundError, DocumentValidationError } from "@/app/domain/document/errors"
import { ConflictError, BusinessRuleViolationError, DatabaseError } from "@/app/domain/shared/base.errors"
import { CreateDocumentDTOSchema, CreateDocumentDTOEncoded } from "@/app/application/dtos/document/create-doc.dto"
import { UpdateDocumentDTOSchema, UpdateDocumentDTOEncoded } from "@/app/application/dtos/document/update-doc.dto"
import { PublishDocumentDTOSchema, PublishDocumentDTOEncoded } from "@/app/application/dtos/document/publish-doc.dto"
import { QueryDocumentsDTOSchema, QueryDocumentsDTOEncoded } from "@/app/application/dtos/document/query-doc.dto"
import { TOKENS } from "@/app/infrastructure/di/tokens"
import { Uuid, UserId, DocumentId } from "@/app/domain/refined/uuid"
import { PaginationOptions, PaginatedResponse } from "@/app/domain/shared/pagination"
import { AccessControlService } from "@/app/application/services/access-control.service"
import { AuditLoggerService } from "@/app/application/services/audit-logger.service"
import { UserContext } from "@/presentation/http/orpc/auth"
import { withTiming } from "@/app/application/utils/timed-logger" 

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

  /*
  * Initializes the document data with default values and generates a new ID if not provided.
  createDocument and UpdateDocument workflows use this method to ensure consistent data structure.

  */
  private initializeDocumentData(input: Partial<SerializedDocument>): SerializedDocument {
    const now = new Date().toISOString()
    const { description, ...rest } = input
    return {
      ...rest,
      id: input.id ?? crypto.randomUUID(),
      currentVersionId: input.currentVersionId ?? crypto.randomUUID(),
      createdAt: input.createdAt ?? now,
      updatedAt: now,
      tags: input.tags ?? [],
      description: description ?? undefined
    } as SerializedDocument
  }

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
        this.accessControlService.enforceAccess(user, "document", "create", {
          workspaceId: user.workspaceId
        }),
        E.flatMap(() =>
          pipe(
            S.decodeUnknown(CreateDocumentDTOSchema)(input),
            E.flatMap((dto) =>
              DocumentSchemaEntity.create(
                this.initializeDocumentData({
                  ...dto,
                  ownerId: user.userId
                })
              )
            ),
            // save the document to the database
            E.flatMap((entity) => this.documentRepository.save(entity)),
            E.tap((doc) =>
              this.auditLogger.logDocumentOperation(
                "document_created",
                doc.id,
                "create",
                user,
                "success",
                { title: (input as any).title }
              )
            ),
            E.tapError((err) =>
              this.auditLogger.logDocumentOperation(
                "document_create_failed",
                "unknown",
                "create",
                user,
                "failure",
                undefined,
                String(err)
              )
            )
          )
        )
      )
    })
  }

  updateDocument(
    input: UpdateDocumentDTOEncoded,
    user: UserContext
  ) {
    return withTiming("Document:updateDocument", {
      correlationId: user.correlationId,
      userId: user.userId,
      workspaceId: user.workspaceId,
    }, async () => {
      return pipe(
        S.decodeUnknown(UpdateDocumentDTOSchema)(input),
        E.flatMap((dto) =>
          S.decodeUnknown(DocumentId)(dto.id).pipe(
            E.flatMap((validId) =>
              this.documentRepository.findById(validId).pipe(
                E.flatMap((option) =>
                  pipe(
                    O.match(option, {
                      onNone: () =>
                        E.fail(
                          DocumentNotFoundError.forResource("Document", String(dto.id))
                        ) as E.Effect<never, DocumentNotFoundError | ConflictError | ParseResult.ParseError | BusinessRuleViolationError | DatabaseError | DocumentValidationError, never>,
                      onSome: (doc) =>
                        pipe(
                          this.accessControlService.enforceAccess(user, "document", "update", {
                            workspaceId: user.workspaceId,
                            resourceOwnerId: doc.ownerId
                          }),
                          E.flatMap(() =>
                            pipe(
                              doc.serialized(),
                              E.flatMap((serialized) => {
                                const merged = this.initializeDocumentData({
                                  ...serialized,
                                  ...dto,
                                  id: validId
                                })
                                return DocumentSchemaEntity.create(merged)
                              }),
                              E.flatMap((updated) =>
                                this.documentRepository.save(updated)
                              ),
                              E.tap(() =>
                                this.auditLogger.logDocumentOperation(
                                  "document_updated",
                                  validId,
                                  "update",
                                  user,
                                  "success",
                                  { fields: Object.keys(dto) }
                                )
                              ),
                              E.tapError((err) =>
                                this.auditLogger.logDocumentOperation(
                                  "document_update_failed",
                                  validId,
                                  "update",
                                  user,
                                  "failure",
                                  undefined,
                                  String(err)
                                )
                              )
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
      )
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
      return pipe(
        S.decodeUnknown(PublishDocumentDTOSchema)(input),
        E.flatMap((dto) =>
          this.documentRepository.findById(dto.documentId).pipe(
            E.flatMap((option) =>
              O.match(option, {
                onNone: () =>
                  E.fail(
                    DocumentNotFoundError.forResource("Document", String(dto.documentId))
                  ) as E.Effect<never, DocumentNotFoundError | ConflictError | ParseResult.ParseError | BusinessRuleViolationError | DatabaseError | DocumentValidationError, never>,
                onSome: (doc) =>
                  pipe(
                    this.accessControlService.enforceAccess(user, "document", "publish", {
                      workspaceId: user.workspaceId,
                      resourceOwnerId: doc.ownerId
                    }),
                    E.flatMap(() =>
                      pipe(
                        E.sync(() => {
                          return {
                            id: doc.id,
                            ownerId: doc.ownerId,
                            title: doc.title,
                            description: O.getOrUndefined(doc.description),
                            tags: O.getOrUndefined(doc.tags),
                            currentVersionId: doc.currentVersionId,
                            createdAt:
                              doc.createdAt instanceof Date
                                ? doc.createdAt.toISOString()
                                : doc.createdAt,
                            updatedAt: new Date().toISOString(),
                            status: "published"
                          } as SerializedDocument
                        }),
                        E.flatMap(DocumentSchemaEntity.create),
                        E.flatMap((updated) =>
                          this.documentRepository.save(updated)
                        ),
                        E.tap(() =>
                          this.auditLogger.logDocumentOperation(
                            "document_published",
                            dto.documentId,
                            "publish",
                            user,
                            "success"
                          )
                        ),
                        E.tapError((err) =>
                          this.auditLogger.logDocumentOperation(
                            "document_publish_failed",
                            dto.documentId,
                            "publish",
                            user,
                            "failure",
                            undefined,
                            String(err)
                          )
                        )
                      )
                    )
                  )
              })
            )
          )
        )
      )
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
          S.decodeUnknown(PaginationOptions)({
            page: dto.page ?? 1, // default page is 1
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
                    })
                  )
                )
              }

              return this.documentRepository.findManyPaginated(pagination, filter)
            })
          )
        )
      )
    })
  }

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
            E.flatMap((option) =>
              O.isNone(option)
                ? E.fail(
                    DocumentNotFoundError.forResource("Document", id)
                  )
                : E.succeed(option.value)
            )
          )
        )
      )
    })
  }
}
