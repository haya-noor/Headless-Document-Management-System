import "reflect-metadata"
import { inject, injectable } from "tsyringe"
import { DateTime, Effect as E, Effect, Option as O, pipe, Schema as S, ParseResult } from "effect"
import crypto from "crypto"

import { DocumentSchema, SerializedDocument } from "@/app/domain/document/schema"
import { DocumentRepository } from "@/app/domain/document/repository"
import { DocumentSchemaEntity } from "@/app/domain/document/entity"
import { DocumentNotFoundError, DocumentValidationError } from "@/app/domain/document/errors"
import { ConflictError, DatabaseError } from "@/app/domain/shared/base.errors"
import { CreateDocumentDTOSchema, CreateDocumentDTOEncoded } from "@/app/application/dtos/document/create-doc.dto"
import { UpdateDocumentDTOSchema, UpdateDocumentDTOEncoded } from "@/app/application/dtos/document/update-doc.dto"
import { PublishDocumentDTOSchema, PublishDocumentDTOEncoded } from "@/app/application/dtos/document/publish-doc.dto"
import { QueryDocumentsDTOSchema, QueryDocumentsDTOEncoded } from "@/app/application/dtos/document/query-doc.dto"
import { TOKENS } from "@/app/infrastructure/di/container"
import { Uuid, UserId, DocumentId } from "@/app/domain/refined/uuid"
import { PaginationOptions, PaginatedResponse } from "@/app/domain/shared/pagination"


// partial: means that the object is not required to be filled out completely, 
// it can be filled out with only some of the fields

@injectable()
export class DocumentWorkflow {
  constructor(
    @inject(TOKENS.DOCUMENT_REPOSITORY)
    private readonly documentRepository: DocumentRepository
  ) {}

  private initializeDocumentData(input: Partial<SerializedDocument>): SerializedDocument {
    // toISOString is used to convert the date to a string, becasue all domain treat 
    // dates as strings e.g createdAt and updatedAt are strings in the domain because of the database
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

  /**
   * Create a new document
   */
  createDocument(
    input: CreateDocumentDTOEncoded
  ): E.Effect<DocumentSchemaEntity, DocumentValidationError | ParseResult.ParseError | ConflictError | DatabaseError> {
    return pipe(
      S.decodeUnknown(CreateDocumentDTOSchema)(input),
      E.flatMap((dto) =>
        DocumentSchemaEntity.create(this.initializeDocumentData(dto))
      ),
      E.flatMap((entity) => this.documentRepository.save(entity))
    )
  }

  updateDocument(
    input: UpdateDocumentDTOEncoded
  ):E.Effect<
    DocumentSchemaEntity,
    DocumentValidationError | DocumentNotFoundError | ParseResult.ParseError | ConflictError | DatabaseError
  >  {
    return pipe(
      // 1. Decode DTO
      S.decodeUnknown(UpdateDocumentDTOSchema)(input),
      E.flatMap((dto) =>
        // 2. Decode document ID
        S.decodeUnknown(DocumentId)(dto.id).pipe( E.flatMap((validId) =>
             // 3. Fetch document by ID
             this.documentRepository.findById(validId).pipe(E.flatMap((option) =>
                 O.isNone(option)? E.fail(new DocumentNotFoundError({
                         resource: "Document",
                         id: String(dto.id),
                         message: `Document with id '${dto.id}' not found`
                       })
                     ) as E.Effect<DocumentSchemaEntity, DocumentValidationError | ParseResult.ParseError | ConflictError | DatabaseError | DocumentNotFoundError, never>
                   : pipe(
                       option.value.serialized(),
                       E.flatMap((serialized: SerializedDocument) => {
                         const merged: SerializedDocument = this.initializeDocumentData({
                           ...serialized,
                           ...dto,
                           id: validId
                         })
                         return DocumentSchemaEntity.create(merged)
                       }),
                       E.flatMap((updated: DocumentSchemaEntity) =>
                         this.documentRepository.save(updated)
                       )
                     )
               )
             )
          )
        )
      )
    )
  }
  

  /**
   * Publish a document (status transition)
   */
  publishDocument(
    input: PublishDocumentDTOEncoded
  ): E.Effect<
    DocumentSchemaEntity,
    DocumentNotFoundError | DocumentValidationError | ParseResult.ParseError | ConflictError | DatabaseError
  > {
    // excessive nesting here (could be make better by using effect.match, use effect composition and control flow)
    return pipe(
      S.decodeUnknown(PublishDocumentDTOSchema)(input),
      E.flatMap((dto) =>
         this.documentRepository.findById(dto.documentId).pipe(
           E.flatMap((option) => O.isNone(option)? E.fail(
                   new DocumentNotFoundError({resource: "Document", id: String(dto.documentId),
                     message: `Document with id '${dto.documentId}' not found`
                   })
                 ) as E.Effect<DocumentSchemaEntity, DocumentValidationError | ParseResult.ParseError | ConflictError | DatabaseError | DocumentNotFoundError, never>
              : pipe(E.sync(() => {
                  const doc = option.value;
                  return {
                    id: doc.id,
                    ownerId: doc.ownerId,
                    title: doc.title,
                    description: O.getOrUndefined(doc.description),
                    tags: O.getOrUndefined(doc.tags),
                    currentVersionId: doc.currentVersionId,
                    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
                    updatedAt: new Date().toISOString(),
                    status: "published"
                  } as SerializedDocument;
                }),
                E.flatMap((serialized) => DocumentSchemaEntity.create(serialized)),
                E.flatMap((updated) => this.documentRepository.save(updated))
              )
           ))
        )
      )
  }
  
  
  
  /**
   * Query documents with optional filters and pagination
   */
  queryDocuments(
    input: QueryDocumentsDTOEncoded
  ): E.Effect<PaginatedResponse<DocumentSchemaEntity>, ParseResult.ParseError | DatabaseError | DocumentValidationError, never> {
    return pipe(
      S.decodeUnknown(QueryDocumentsDTOSchema)(input),
      E.flatMap((dto) =>
         S.decodeUnknown(PaginationOptions)({
           page: dto.pageNum ?? 1,
           limit: dto.pageSize ?? 10
         }).pipe(
          E.flatMap((pagination) => {
            const filter: { ownerId?: UserId; tags?: string[] } = {
              tags: dto.tag ? [dto.tag] : undefined
            }

            if (dto.ownerId) {
              return S.decodeUnknown(UserId)(dto.ownerId).pipe(
                E.flatMap((ownerId) =>
                  this.documentRepository.findManyPaginated(pagination, {
                    ...filter,
                    ownerId
                  })
                )
              )
            }

            return this.documentRepository.findManyPaginated(pagination, filter)
          })
        )
      )
    ) as E.Effect<PaginatedResponse<DocumentSchemaEntity>, ParseResult.ParseError | DatabaseError | DocumentValidationError, never>
  }
}