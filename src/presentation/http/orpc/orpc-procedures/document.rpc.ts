import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema as S } from "effect"
import { CreateDocumentDTOSchema } from "@/app/application/dtos/document/create-doc.dto"
import { UpdateDocumentDTOSchema } from "@/app/application/dtos/document/update-doc.dto"
import { PublishDocumentDTOSchema } from "@/app/application/dtos/document/publish-doc.dto"
import { QueryDocumentsDTOSchema } from "@/app/application/dtos/document/query-doc.dto"
import type { DocumentWorkflow } from "@/app/application/workflows/doc.workflow"
import { TOKENS } from "@/app/infrastructure/di/tokens"
import { container } from "@/app/infrastructure/di/container"
import { runEffect, enrichWithContext } from "./shared"
import { normalizeDocumentResponse } from "../normalize"

// Define RPC procedures
export const createDocumentRpc = Rpc.make("createDocument", {
  payload: CreateDocumentDTOSchema,
  success: S.Struct({
    id: S.String,
    title: S.String,
    description: S.optional(S.String),
    tags: S.Array(S.String),
    createdAt: S.String,
    updatedAt: S.String
  }),
  error: S.String
})

export const updateDocumentRpc = Rpc.make("updateDocument", {
  payload: UpdateDocumentDTOSchema,
  success: S.Struct({
    id: S.String,
    updatedAt: S.String
  }),
  error: S.String
})

export const publishDocumentRpc = Rpc.make("publishDocument", {
  payload: PublishDocumentDTOSchema,
  success: S.Struct({
    id: S.String,
    publishStatus: S.String,
    updatedAt: S.String
  }),
  error: S.String
})

export const listDocumentsRpc = Rpc.make("listDocuments", {
  payload: QueryDocumentsDTOSchema,
  success: S.Struct({
    data: S.Array(
      S.Struct({
        id: S.String,
        title: S.String,
        createdAt: S.String,
        updatedAt: S.String
      })
    ),
    pagination: S.Struct({
      page: S.Number,
      limit: S.Number,
      total: S.Number,
      totalPages: S.Number
    })
  }),
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
  createDocument: async (payload: S.Schema.Type<typeof CreateDocumentDTOSchema>, options: { headers: any }) => {
    const context = {
      userId: options.headers.get("x-user-id") || "guest",
      workspaceId: options.headers.get("x-workspace-id") || "default"
    }
    const workflow = container.resolve<DocumentWorkflow>(TOKENS.DOCUMENT_WORKFLOW)
    const result = await runEffect(workflow.createDocument(enrichWithContext(payload, context), context))
    const serialized = await runEffect(result.serialized())
    return normalizeDocumentResponse(serialized)
  },

  updateDocument: async (payload: S.Schema.Type<typeof UpdateDocumentDTOSchema>, options: { headers: any }) => {
    const context = {
      userId: options.headers.get("x-user-id") || "guest",
      workspaceId: options.headers.get("x-workspace-id") || "default"
    }
    const workflow = container.resolve<DocumentWorkflow>(TOKENS.DOCUMENT_WORKFLOW)
    return runEffect(workflow.updateDocument(enrichWithContext(payload, context), context))
  },

  publishDocument: async (payload: S.Schema.Type<typeof PublishDocumentDTOSchema>, options: { headers: any }) => {
    const context = {
      userId: options.headers.get("x-user-id") || "guest",
      workspaceId: options.headers.get("x-workspace-id") || "default"
    }
    const workflow = container.resolve<DocumentWorkflow>(TOKENS.DOCUMENT_WORKFLOW)
    return runEffect(workflow.publishDocument(enrichWithContext(payload, context), context))
  },

  listDocuments: async (payload: S.Schema.Type<typeof QueryDocumentsDTOSchema>, options: { headers: any }) => {
    const context = {
      userId: options.headers.get("x-user-id") || "guest",
      workspaceId: options.headers.get("x-workspace-id") || "default"
    }
    const workflow = container.resolve<DocumentWorkflow>(TOKENS.DOCUMENT_WORKFLOW)
    return runEffect(workflow.queryDocuments(enrichWithContext(payload, context), context))
  }
}
