import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema as S } from "effect"
import { InitiateUploadDTOSchema } from "@/app/application/dtos/upload/initiate-upload.dto"
import { ConfirmUploadDTOSchema } from "@/app/application/dtos/upload/confirm-upload.dto"
import type { UploadWorkflow } from "@/app/application/workflows/upload.workflow"
import { TOKENS } from "@/app/infrastructure/di/tokens"
import { container } from "@/app/infrastructure/di/container"
import { runEffect, enrichWithContext } from "./shared"

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
  initiateUpload: async (payload: S.Schema.Type<typeof InitiateUploadDTOSchema>, options: { headers: any }) => {
    const context = {
      userId: options.headers.get("x-user-id") || "guest",
      workspaceId: options.headers.get("x-workspace-id") || "default"
    }
    const workflow = container.resolve<UploadWorkflow>(TOKENS.UPLOAD_WORKFLOW)
    return runEffect(workflow.initiateUpload(enrichWithContext(payload, context), context))
  },

  confirmUpload: async (payload: S.Schema.Type<typeof ConfirmUploadDTOSchema>, options: { headers: any }) => {
    const context = {
      userId: options.headers.get("x-user-id") || "guest",
      workspaceId: options.headers.get("x-workspace-id") || "default"
    }
    const workflow = container.resolve<UploadWorkflow>(TOKENS.UPLOAD_WORKFLOW)
    return runEffect(workflow.confirmUpload(enrichWithContext(payload, context), context))
  }
}
