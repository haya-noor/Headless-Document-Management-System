import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema as S } from "effect"
import { GrantAccessDTOSchema } from "@/app/application/dtos/access-policy/grant-access.dto"
import { RevokeAccessDTOSchema } from "@/app/application/dtos/access-policy/revoke-access.dto"
import { CheckAccessDTOSchema } from "@/app/application/dtos/access-policy/check-access.dto"
import type { AccessPolicyWorkflow } from "@/app/application/workflows/access-policy.workflow"
import { TOKENS } from "@/app/infrastructure/di/tokens"
import { container } from "@/app/infrastructure/di/container"
import { runEffect, enrichWithContext } from "./shared"

// Define RPC procedures
export const grantAccessRpc = Rpc.make("grantAccess", {
  payload: GrantAccessDTOSchema,
  success: S.Struct({
    id: S.String,
    subjectId: S.String,
    resourceId: S.String,
    actions: S.Array(S.String),
    createdAt: S.String,
    updatedAt: S.String
  }),
  error: S.String
})

export const revokeAccessRpc = Rpc.make("revokeAccess", {
  payload: RevokeAccessDTOSchema,
  success: S.Struct({
    success: S.Boolean,
    documentId: S.String,
    revokedFrom: S.String
  }),
  error: S.String
})

export const checkAccessRpc = Rpc.make("checkAccess", {
  payload: CheckAccessDTOSchema,
  success: S.Struct({ allowed: S.Boolean }),
  error: S.String
})

// Create RPC group
export const AccessPolicyRPC = RpcGroup.make(
  grantAccessRpc,
  revokeAccessRpc,
  checkAccessRpc
)

// Define handlers
export const accessPolicyHandlers = {
  grantAccess: async (payload: S.Schema.Type<typeof GrantAccessDTOSchema>, options: { headers: any }) => {
    const context = {
      userId: options.headers.get("x-user-id") || "guest",
      workspaceId: options.headers.get("x-workspace-id") || "default"
    }
    const workflow = container.resolve<AccessPolicyWorkflow>(TOKENS.ACCESS_POLICY_WORKFLOW)
    return runEffect(workflow.grantAccess(enrichWithContext(payload, context), context))
  },

  revokeAccess: async (payload: S.Schema.Type<typeof RevokeAccessDTOSchema>, options: { headers: any }) => {
    const context = {
      userId: options.headers.get("x-user-id") || "guest",
      workspaceId: options.headers.get("x-workspace-id") || "default"
    }
    const workflow = container.resolve<AccessPolicyWorkflow>(TOKENS.ACCESS_POLICY_WORKFLOW)
    await runEffect(workflow.revokeAccess(enrichWithContext(payload, context), context))
    
    return {
      success: true,
      documentId: payload.documentId,
      revokedFrom: payload.revokedFrom
    }
  },

  checkAccess: async (payload: S.Schema.Type<typeof CheckAccessDTOSchema>, options: { headers: any }) => {
    const context = {
      userId: options.headers.get("x-user-id") || "guest",
      workspaceId: options.headers.get("x-workspace-id") || "default"
    }
    const workflow = container.resolve<AccessPolicyWorkflow>(TOKENS.ACCESS_POLICY_WORKFLOW)
    await runEffect(workflow.checkAccess(enrichWithContext(payload, context), context))
    
    return { allowed: true }
  }
}
