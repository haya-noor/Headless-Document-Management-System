import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema as S } from "effect"
import { CreateDownloadTokenDTOSchema } from "@/app/application/dtos/download-token/create-token.dto"
import { ValidateDownloadTokenDTOSchema } from "@/app/application/dtos/download-token/validate-token.dto"
import type { DownloadTokenWorkflow } from "@/app/application/workflows/download-token.workflow"
import { TOKENS } from "@/app/infrastructure/di/tokens"
import { container } from "@/app/infrastructure/di/container"
import { runEffect, createAuthenticatedContext, enrichDTOWithContext } from "./shared"
import { normalizeDownloadTokenResponse } from "../normalize"


/*
Rpc.make(...)	Defines schema-based APIs for remote procedure calls
RpcGroup.make(...)	Groups related RPCs together for structured access
accessPolicyHandlers	Provides actual resolver logic for RPC calls using the domain workflow layer
runEffect(...)	Converts Effect return values into standard promises / outputs for ORPC
*/ 


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
  createDownloadToken: async (payload: S.Schema.Type<typeof CreateDownloadTokenDTOSchema>, options: { headers: Headers }) => {
    const user = await createAuthenticatedContext(options.headers)
    const workflow = container.resolve<DownloadTokenWorkflow>(TOKENS.DOWNLOAD_TOKEN_WORKFLOW)
    const effect = await workflow.createToken(enrichDTOWithContext(payload, user), user)
    const result = await runEffect(effect)
    const serialized = await runEffect(result.serialized())
    return normalizeDownloadTokenResponse(serialized)
  },

  validateDownloadToken: async (payload: S.Schema.Type<typeof ValidateDownloadTokenDTOSchema>, options: { headers: Headers }) => {
    const user = await createAuthenticatedContext(options.headers)
    const workflow = container.resolve<DownloadTokenWorkflow>(TOKENS.DOWNLOAD_TOKEN_WORKFLOW)
    const effect = await workflow.validateToken(enrichDTOWithContext(payload, user), user)
    const token = await runEffect(effect)
    
    return {
      success: true,
      tokenId: token.id,
      validatedAt: token.updatedAt
    }
  }
}
