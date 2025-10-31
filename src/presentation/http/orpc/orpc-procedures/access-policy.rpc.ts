import { Rpc, RpcGroup } from "@effect/rpc"
import { Schema as S } from "effect"
import { GrantAccessDTOSchema } from "@/app/application/dtos/access-policy/grant-access.dto"
import { RevokeAccessDTOSchema } from "@/app/application/dtos/access-policy/revoke-access.dto"
import { CheckAccessDTOSchema } from "@/app/application/dtos/access-policy/check-access.dto"
import { GrantAccessResponseSchema } from "@/app/application/dtos/access-policy/grant-access-response.dto"
import { RevokeAccessResponseSchema } from "@/app/application/dtos/access-policy/revoke-access-response.dto"
import { CheckAccessResponseSchema } from "@/app/application/dtos/access-policy/check-access-response.dto"
import type { AccessPolicyWorkflow } from "@/app/application/workflows/access-policy.workflow"
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
export const grantAccessRpc = Rpc.make("grantAccess", {
  payload: GrantAccessDTOSchema,
  success: GrantAccessResponseSchema,
  error: S.String
})

export const revokeAccessRpc = Rpc.make("revokeAccess", {
  payload: RevokeAccessDTOSchema,
  success: RevokeAccessResponseSchema,
  error: S.String
})

export const checkAccessRpc = Rpc.make("checkAccess", {
  payload: CheckAccessDTOSchema,
  success: CheckAccessResponseSchema,
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
  grantAccess: async (payload: S.Schema.Type<typeof GrantAccessDTOSchema>, options: { headers: Headers }) => {
    const user = await createAuthenticatedContext(options.headers)
    const workflow = container.resolve<AccessPolicyWorkflow>(TOKENS.ACCESS_POLICY_WORKFLOW)
    const effect = await workflow.grantAccess(enrichDTOWithContext(payload, user), user)
    return runEffect(effect)
  },

  revokeAccess: async (payload: S.Schema.Type<typeof RevokeAccessDTOSchema>, options: { headers: Headers }) => {
    const user = await createAuthenticatedContext(options.headers)
    const workflow = container.resolve<AccessPolicyWorkflow>(TOKENS.ACCESS_POLICY_WORKFLOW)
    const effect = await workflow.revokeAccess(enrichDTOWithContext(payload, user), user)
    await runEffect(effect)
    
    return {
      success: true,
      documentId: payload.documentId,
      revokedFrom: payload.revokedFrom
    }
  },

  checkAccess: async (payload: S.Schema.Type<typeof CheckAccessDTOSchema>, options: { headers: Headers }) => {
    const user = await createAuthenticatedContext(options.headers)
    const workflow = container.resolve<AccessPolicyWorkflow>(TOKENS.ACCESS_POLICY_WORKFLOW)
    const effect = await workflow.checkAccess(enrichDTOWithContext(payload, user), user)
    await runEffect(effect)
    
    return { allowed: true }
  }
}
