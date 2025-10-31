import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema as S } from "effect"
import { CreateDocumentDTOSchema } from "@/app/application/dtos/document/create-doc.dto"
import { UpdateDocumentDTOSchema } from "@/app/application/dtos/document/update-doc.dto"
import { PublishDocumentDTOSchema } from "@/app/application/dtos/document/publish-doc.dto"
import { QueryDocumentsDTOSchema } from "@/app/application/dtos/document/query-doc.dto"
import { CreateDocumentResponseSchema } from "@/app/application/dtos/document/create-doc-response.dto"
import { UpdateDocumentResponseSchema } from "@/app/application/dtos/document/update-doc-response.dto"
import { PublishDocumentResponseSchema } from "@/app/application/dtos/document/publish-doc-response.dto"
import { ListDocumentsResponseSchema } from "@/app/application/dtos/document/list-docs-response.dto"
import type { DocumentWorkflow } from "@/app/application/workflows/doc.workflow"
import { TOKENS } from "@/app/infrastructure/di/tokens"
import { container } from "@/app/infrastructure/di/container"
import { runEffect, createAuthenticatedContext, enrichDTOWithContext } from "./shared"
import { normalizeDocumentResponse, normalizePaginatedResponse } from "../normalize"


/*
Rpc.make(...)	Defines schema-based APIs for remote procedure calls
RpcGroup.make(...)	Groups related RPCs together for structured access
accessPolicyHandlers	Provides actual resolver logic for RPC calls using the domain workflow layer
runEffect(...)	Converts Effect return values into standard promises / outputs for ORPC
*/ 


// Define RPC procedures
export const createDocumentRpc = Rpc.make("createDocument", {
  payload: CreateDocumentDTOSchema,
  success: CreateDocumentResponseSchema,
  error: S.String
})

export const updateDocumentRpc = Rpc.make("updateDocument", {
  payload: UpdateDocumentDTOSchema,
  success: UpdateDocumentResponseSchema,
  error: S.String
})

export const publishDocumentRpc = Rpc.make("publishDocument", {
  payload: PublishDocumentDTOSchema,
  success: PublishDocumentResponseSchema,
  error: S.String
})

export const listDocumentsRpc = Rpc.make("listDocuments", {
  payload: QueryDocumentsDTOSchema,
  success: ListDocumentsResponseSchema,
  error: S.String
})

// Create RPC group
export const DocumentRPC = RpcGroup.make(
  createDocumentRpc,
  updateDocumentRpc,
  publishDocumentRpc,
  listDocumentsRpc
)

// Define handlers
export const documentHandlers = {
  createDocument: async (payload: S.Schema.Type<typeof CreateDocumentDTOSchema>, options: { headers: Headers }) => {
    const user = await createAuthenticatedContext(options.headers)
    const workflow = container.resolve<DocumentWorkflow>(TOKENS.DOCUMENT_WORKFLOW)
    const effect = await workflow.createDocument(enrichDTOWithContext(payload, user), user)
    const result = await runEffect(effect)
    const serialized = await runEffect(result.serialized())
    return normalizeDocumentResponse(serialized)
  },

  updateDocument: async (payload: S.Schema.Type<typeof UpdateDocumentDTOSchema>, options: { headers: Headers }) => {
    const user = await createAuthenticatedContext(options.headers)
    const workflow = container.resolve<DocumentWorkflow>(TOKENS.DOCUMENT_WORKFLOW)
    const effect = await workflow.updateDocument(enrichDTOWithContext(payload, user), user)
    const result = await runEffect(effect)
    const serialized = await runEffect(result.serialized())
    return normalizeDocumentResponse(serialized)
  },

  publishDocument: async (payload: S.Schema.Type<typeof PublishDocumentDTOSchema>, options: { headers: Headers }) => {
    const user = await createAuthenticatedContext(options.headers)
    const workflow = container.resolve<DocumentWorkflow>(TOKENS.DOCUMENT_WORKFLOW)
    const effect = await workflow.publishDocument(enrichDTOWithContext(payload, user), user)
    const result = await runEffect(effect)
    const serialized = await runEffect(result.serialized())
    return normalizeDocumentResponse(serialized)
  },

  listDocuments: async (payload: S.Schema.Type<typeof QueryDocumentsDTOSchema>, options: { headers: Headers }) => {
    const user = await createAuthenticatedContext(options.headers)
    const workflow = container.resolve<DocumentWorkflow>(TOKENS.DOCUMENT_WORKFLOW)
    const effect = await workflow.queryDocuments(enrichDTOWithContext(payload, user), user)
    const paginated = await runEffect(effect as any) as { data: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }
    // Normalize each document in the paginated response
    // Documents come as entities, so we need to serialize and normalize them
    const normalizedData = await Promise.all(
      paginated.data.map(async (doc: any) => {
        const serialized = await runEffect(doc.serialized()) as any
        return normalizeDocumentResponse(serialized)
      })
    )
    return normalizePaginatedResponse({
      data: normalizedData,
      pagination: paginated.pagination
    })
  }
}
