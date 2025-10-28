import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema as S } from "effect"
import { CreateDownloadTokenDTOSchema } from "@/app/application/dtos/download-token/create-token.dto"
import { ValidateDownloadTokenDTOSchema } from "@/app/application/dtos/download-token/validate-token.dto"
import type { DownloadTokenWorkflow } from "@/app/application/workflows/download-token.workflow"
import { TOKENS } from "@/app/infrastructure/di/tokens"
import { container } from "@/app/infrastructure/di/container"
import { runEffect, enrichWithContext } from "./shared"

// Define RPC procedures
export const createDownloadTokenRpc = Rpc.make("createDownloadToken", {
  payload: CreateDownloadTokenDTOSchema,
  success: S.Struct({
    id: S.String,
    token: S.String,
    documentId: S.String,
    issuedTo: S.String,
    expiresAt: S.DateFromSelf,
    createdAt: S.String,
    updatedAt: S.String
  }),
  error: S.String
})

export const validateDownloadTokenRpc = Rpc.make("validateDownloadToken", {
  payload: ValidateDownloadTokenDTOSchema,
  success: S.Struct({
    success: S.Literal(true),
    tokenId: S.String,
    validatedAt: S.String
  }),
  error: S.String
})

// Create RPC group
export const DownloadTokenRPC = RpcGroup.make(
  createDownloadTokenRpc,
  validateDownloadTokenRpc
)

// Define handlers
export const downloadTokenHandlers = {
  createDownloadToken: async (payload: S.Schema.Type<typeof CreateDownloadTokenDTOSchema>, options: { headers: any }) => {
    const context = {
      userId: options.headers.get("x-user-id") || "guest",
      workspaceId: options.headers.get("x-workspace-id") || "default"
    }
    const workflow = container.resolve<DownloadTokenWorkflow>(TOKENS.DOWNLOAD_TOKEN_WORKFLOW)
    return runEffect(workflow.createToken(enrichWithContext(payload, context)))
  },

  validateDownloadToken: async (payload: S.Schema.Type<typeof ValidateDownloadTokenDTOSchema>, options: { headers: any }) => {
    const context = {
      userId: options.headers.get("x-user-id") || "guest",
      workspaceId: options.headers.get("x-workspace-id") || "default"
    }
    const workflow = container.resolve<DownloadTokenWorkflow>(TOKENS.DOWNLOAD_TOKEN_WORKFLOW)
    const token = await runEffect(workflow.validateToken(enrichWithContext(payload, context)))
    
    return {
      success: true,
      tokenId: token.id,
      validatedAt: token.updatedAt
    }
  }
}
