import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema as S } from "effect"
import { InitiateUploadDTOSchema } from "@/app/application/dtos/upload/initiate-upload.dto"
import { ConfirmUploadDTOSchema } from "@/app/application/dtos/upload/confirm-upload.dto"
import { UploadDocumentDTOSchema } from "@/app/application/dtos/upload/upload-document.dto"
import { InitiateUploadResponseSchema } from "@/app/application/dtos/upload/initiate-upload-response.dto"
import { ConfirmUploadResponseSchema } from "@/app/application/dtos/upload/confirm-upload-response.dto"
import { UploadDocumentResponseSchema } from "@/app/application/dtos/upload/upload-document-response.dto"
import type { UploadWorkflow } from "@/app/application/workflows/upload.workflow"
import { TOKENS } from "@/app/infrastructure/di/tokens"
import { container } from "@/app/infrastructure/di/container"
import { runEffect, createAuthenticatedContext, enrichDTOWithContext, type RpcHandlerOptions } from "./shared"
import { normalizeInitiateUploadResponse, normalizeConfirmUploadResponse } from "../normalize"

/**
 * High-level notes
 * ----------------
 * - Rpc.make defines a typed RPC endpoint (payload/response/error validated by effect/Schema).
 * - RpcGroup.make bundles related RPCs for export/registration.
 * - Handlers are thin adapters:
 *      1) authenticate (createAuthenticatedContext)
 *      2) resolve workflow from DI container
 *      3) call workflow method (returns Effect)
 *      4) normalize/serialize domain entities to transport-friendly DTOs
 * 
 export const initiateUploadRpc = Rpc.make("initiateUpload", {
  Client request DTO: who/what is initiating (docId, mimeType, size, etc.)
  payload: InitiateUploadDTOSchema,
  Server response DTO: what the client will receive (url, expiresIn)
  success: InitiateUploadResponseSchema,
  Error response: what the client will receive if the request fails (string error message)
  Effect schema string is a built-in schema for string values 
  if it fails clinet will receive a string error message 
  (like "File is required for uploadFile")
  error: S.String
})
 */


// Define RPC procedures
export const initiateUploadRpc = Rpc.make("initiateUpload", {
  payload: InitiateUploadDTOSchema,
  success: InitiateUploadResponseSchema,
  error: S.String
})

export const confirmUploadRpc = Rpc.make("confirmUpload", {
  payload: ConfirmUploadDTOSchema,
  success: ConfirmUploadResponseSchema,
  error: S.String
})

export const uploadFileRpc = Rpc.make("uploadFile", {
  payload: UploadDocumentDTOSchema,
  success: UploadDocumentResponseSchema,
  error: S.String
})

// Create RPC group
export const UploadRPC = RpcGroup.make(
  initiateUploadRpc,
  confirmUploadRpc,
  uploadFileRpc
)

// Define handlers (binds the RPC procedures to the handlers(workflows)))
export const uploadHandlers = {
  initiateUpload: async (payload: S.Schema.Type<typeof InitiateUploadDTOSchema>, options: RpcHandlerOptions) => {
    const user = await createAuthenticatedContext(options.headers)
    const workflow = container.resolve<UploadWorkflow>(TOKENS.UPLOAD_WORKFLOW)
    const effect = await workflow.initiateUpload(enrichDTOWithContext(payload, user), user)
    const result = await runEffect(effect)
    // Transform PreSignedUrlResponse (expiresAt: Date) to InitiateUploadResponse (expiresIn: number)
    return normalizeInitiateUploadResponse(result)
  },

  confirmUpload: async (payload: S.Schema.Type<typeof ConfirmUploadDTOSchema>, options: RpcHandlerOptions) => {
    const user = await createAuthenticatedContext(options.headers)
    const workflow = container.resolve<UploadWorkflow>(TOKENS.UPLOAD_WORKFLOW)
    const effect = await workflow.confirmUpload(enrichDTOWithContext(payload, user), user)
    const result = await runEffect(effect)
    // Serialize the DocumentVersionEntity and extract required fields
    const serialized = await runEffect(result.serialized())
    return normalizeConfirmUploadResponse(serialized)
  },

  uploadFile: async (payload: S.Schema.Type<typeof UploadDocumentDTOSchema>, options: RpcHandlerOptions) => {
    const user = await createAuthenticatedContext(options.headers)
    const workflow = container.resolve<UploadWorkflow>(TOKENS.UPLOAD_WORKFLOW)

    /*
    multipart/form-data is an HTTP request body format used to send files
    and other data in a single request. It is a common way to upload files

    options.request is the incoming API Request to upload the file. 
    await options.request.formData(): parses a multipart/form-data body into 
    a FormData object.
    formData.get("file") grabs the file part whose field name is "file".
    */
    if (!options.request) {
      throw new Error("File upload requires multipart/form-data request")
    }
    const formData = await options.request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      throw new Error("File is required for uploadFile")
    }

    const enriched = enrichDTOWithContext(
      {
        ...payload,
        filename: file.name,
        file
      },
      user
    )

    const effect = await workflow.uploadFile(enriched, user)
    const version = await runEffect(effect)
    const serialized = await runEffect(version.serialized())
    return normalizeConfirmUploadResponse(serialized)
  }
}

