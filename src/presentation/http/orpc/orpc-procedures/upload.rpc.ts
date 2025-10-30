import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema as S } from "effect"
import { InitiateUploadDTOSchema } from "@/app/application/dtos/upload/initiate-upload.dto"
import { ConfirmUploadDTOSchema } from "@/app/application/dtos/upload/confirm-upload.dto"
import type { UploadWorkflow } from "@/app/application/workflows/upload.workflow"
import { TOKENS } from "@/app/infrastructure/di/tokens"
import { container } from "@/app/infrastructure/di/container"
import { runEffect, createAuthenticatedContext, enrichDTOWithContext } from "./shared"


/*
Rpc.make(...)	Defines schema-based APIs for remote procedure calls
RpcGroup.make(...)	Groups related RPCs together for structured access
accessPolicyHandlers	Provides actual resolver logic for RPC calls using the domain workflow layer
runEffect(...)	Converts Effect return values into standard promises / outputs for ORPC
*/ 


// Define RPC procedures
export const initiateUploadRpc = Rpc.make("initiateUpload", {
  payload: InitiateUploadDTOSchema,
  success: S.Struct({
    url: S.String,
    expiresIn: S.Number
  }),
  error: S.String
})

export const confirmUploadRpc = Rpc.make("confirmUpload", {
  payload: ConfirmUploadDTOSchema,
  success: S.Struct({
    id: S.String,
    documentId: S.String,
    storageKey: S.String,
    checksum: S.String,
    uploadedBy: S.String,
    createdAt: S.String
  }),
  error: S.String
})

// Create RPC group
export const UploadRPC = RpcGroup.make(
  initiateUploadRpc,
  confirmUploadRpc
)

// Define handlers
export const uploadHandlers = {
  initiateUpload: async (payload: S.Schema.Type<typeof InitiateUploadDTOSchema>, options: { headers: Headers }) => {
    const user = await createAuthenticatedContext(options.headers)
    const workflow = container.resolve<UploadWorkflow>(TOKENS.UPLOAD_WORKFLOW)
    const effect = await workflow.initiateUpload(enrichDTOWithContext(payload, user), user)
    return runEffect(effect)
  },

  confirmUpload: async (payload: S.Schema.Type<typeof ConfirmUploadDTOSchema>, options: { headers: Headers }) => {
    const user = await createAuthenticatedContext(options.headers)
    const workflow = container.resolve<UploadWorkflow>(TOKENS.UPLOAD_WORKFLOW)
    const effect = await workflow.confirmUpload(enrichDTOWithContext(payload, user), user)
    return runEffect(effect)
  }
}
