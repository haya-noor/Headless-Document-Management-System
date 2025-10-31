import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema as S } from "effect"
import { ListVersionsDTOSchema } from "@/app/application/dtos/document-version/list-versions.dto"
import { GetVersionDTOSchema } from "@/app/application/dtos/document-version/get-version.dto"
import { GetLatestVersionDTOSchema } from "@/app/application/dtos/document-version/get-latest-version.dto"
import { DocumentVersionResponseSchema } from "@/app/application/dtos/document-version/document-version-response.dto"
import { ListVersionsResponseSchema } from "@/app/application/dtos/document-version/list-versions-response.dto"
import type { DocumentVersionWorkflow } from "@/app/application/workflows/document-version.workflow"
import { TOKENS } from "@/app/infrastructure/di/tokens"
import { container } from "@/app/infrastructure/di/container"
import { runEffect, createAuthenticatedContext, enrichDTOWithContext, type RpcHandlerOptions } from "./shared"
import { normalizeDocumentVersionResponse } from "../normalize"


/*
Rpc.make(...)	Defines schema-based APIs for remote procedure calls
RpcGroup.make(...)	Groups related RPCs together for structured access
documentVersionHandlers	Provides actual resolver logic for RPC calls using the domain workflow layer
runEffect(...)	Converts Effect return values into standard promises / outputs for ORPC
*/ 


// Define RPC procedures
export const listVersionsRpc = Rpc.make("listVersions", {
  payload: ListVersionsDTOSchema,
  success: ListVersionsResponseSchema,
  error: S.String
})

export const getVersionRpc = Rpc.make("getVersion", {
  payload: GetVersionDTOSchema,
  success: DocumentVersionResponseSchema,
  error: S.String
})

export const getLatestVersionRpc = Rpc.make("getLatestVersion", {
  payload: GetLatestVersionDTOSchema,
  success: DocumentVersionResponseSchema,
  error: S.String
})

// Create RPC group
export const DocumentVersionRPC = RpcGroup.make(
  listVersionsRpc,
  getVersionRpc,
  getLatestVersionRpc
)

// Define handlers
export const documentVersionHandlers = {
  listVersions: async (payload: S.Schema.Type<typeof ListVersionsDTOSchema>, options: RpcHandlerOptions) => {
    const user = await createAuthenticatedContext(options.headers)
    const workflow = container.resolve<DocumentVersionWorkflow>(TOKENS.DOCUMENT_VERSION_WORKFLOW)
    const effect = await workflow.listVersions(enrichDTOWithContext(payload, user), user)
    const versions = await runEffect(effect)
    // Serialize all versions
    const serializedVersions = await Promise.all(
      versions.map(async (version) => {
        const serialized = await runEffect(version.serialized())
        return normalizeDocumentVersionResponse(serialized)
      })
    )
    return { data: serializedVersions }
  },

  getVersion: async (payload: S.Schema.Type<typeof GetVersionDTOSchema>, options: RpcHandlerOptions) => {
    const user = await createAuthenticatedContext(options.headers)
    const workflow = container.resolve<DocumentVersionWorkflow>(TOKENS.DOCUMENT_VERSION_WORKFLOW)
    const effect = await workflow.getVersion(enrichDTOWithContext(payload, user), user)
    const version = await runEffect(effect)
    const serialized = await runEffect(version.serialized())
    return normalizeDocumentVersionResponse(serialized)
  },

  getLatestVersion: async (payload: S.Schema.Type<typeof GetLatestVersionDTOSchema>, options: RpcHandlerOptions) => {
    const user = await createAuthenticatedContext(options.headers)
    const workflow = container.resolve<DocumentVersionWorkflow>(TOKENS.DOCUMENT_VERSION_WORKFLOW)
    const effect = await workflow.getLatestVersion(enrichDTOWithContext(payload, user), user)
    const version = await runEffect(effect)
    const serialized = await runEffect(version.serialized())
    return normalizeDocumentVersionResponse(serialized)
  }
}


