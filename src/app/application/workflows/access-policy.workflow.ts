import "reflect-metadata"
import { inject, injectable } from "tsyringe"
import { Effect as E, Option, pipe, Schema as S } from "effect"
import crypto from "crypto"

import { TOKENS } from "@/app/infrastructure/di/tokens"
import { AccessPolicyRepository } from "@/app/domain/access-policy/repository"
import { GrantAccessDTOSchema, GrantAccessDTOEncoded } from "@/app/application/dtos/access-policy/grant-access.dto"
import { RevokeAccessDTOSchema, RevokeAccessDTOEncoded } from "@/app/application/dtos/access-policy/revoke-access.dto"
import { CheckAccessDTOSchema, CheckAccessDTOEncoded } from "@/app/application/dtos/access-policy/check-access.dto"
import { AccessPolicyEntity } from "@/app/domain/access-policy/entity"
import { AccessPolicyValidationError } from "@/app/domain/access-policy/errors"
import { AccessControlService } from "@/app/application/services/access-control.service"
import { AuditLoggerService } from "@/app/application/services/audit-logger.service"
import { UserContext } from "@/presentation/http/orpc/auth"
import { withTiming } from "@/app/application/utils/timed-logger" 
import { withAppErrorBoundary } from "@/app/application/utils/application-error"
import { DocumentRepository } from "@/app/domain/document/repository"
import { initializeEntityDefaults } from "@/app/domain/shared/schema.utils"

@injectable()
export class AccessPolicyWorkflow {
  constructor(
    @inject(TOKENS.ACCESS_POLICY_REPOSITORY)
    private readonly accessRepo: AccessPolicyRepository,
    @inject(TOKENS.DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository,

    @inject(TOKENS.ACCESS_CONTROL_SERVICE)
    private readonly accessControl: AccessControlService,

    @inject(TOKENS.AUDIT_LOGGER_SERVICE)
    private readonly auditLogger: AuditLoggerService
  ) {}

  grantAccess(
    input: GrantAccessDTOEncoded,
    user: UserContext
  ) {
    return withTiming("AccessPolicy:grantAccess", {
      correlationId: user.correlationId,
      userId: user.userId,
      workspaceId: user.workspaceId,
    }, async () => {
      const eff = E.gen(function* (this: AccessPolicyWorkflow) {
        const dto = yield* S.decodeUnknown(GrantAccessDTOSchema)(input)
        const docOpt = yield* this.documentRepo.findById(dto.documentId)
        if (Option.isNone(docOpt)) {
          return yield* E.fail(new Error(`Document ${String(dto.documentId)} not found`))
        }
        const doc = docOpt.value
        // Check that the user is the document owner - only document owners can grant access
        yield* this.accessControl.requirePermission(
          user, "document", "grant", { resourceOwnerId: doc.ownerId }
        )

        const policyData = {
          ...initializeEntityDefaults(),
          name: `Access to document ${dto.documentId}`,
          description: `Granted by ${user.userId} to ${dto.grantedTo}`,
          subjectType: "user" as const,
          subjectId: dto.grantedTo,
          resourceType: "document" as const,
          resourceId: dto.documentId,
          actions: dto.actions,
          isActive: true,
          priority: dto.priority
        }

        const policy = yield* AccessPolicyEntity.create(policyData)
        const saved = yield* this.accessRepo.save(policy)

        yield* this.auditLogger.logAccessControlChange(
          "access_policy_granted", saved.id, "grant", user, dto.grantedTo, "success",
          { grantedTo: dto.grantedTo, actions: dto.actions }
        )

        return saved
      }.bind(this))
      return withAppErrorBoundary(eff)
    })
  }

  revokeAccess(
    input: RevokeAccessDTOEncoded,
    user: UserContext
  ) {
    return withTiming("AccessPolicy:revokeAccess", {
      correlationId: user.correlationId,
      userId: user.userId,
      workspaceId: user.workspaceId,
    }, async () => {
      const eff = E.gen(function* (this: AccessPolicyWorkflow) {
        const dto = yield* S.decodeUnknown(RevokeAccessDTOSchema)(input)
        const docOpt = yield* this.documentRepo.findById(dto.documentId)
        
        const resourceOwnerId = docOpt._tag === "Some" ? docOpt.value.ownerId : undefined
        yield* this.accessControl.requirePermission(
          user, "accessPolicy", "revoke", { resourceOwnerId })
        yield* this.accessRepo.remove(dto.documentId, dto.revokedFrom)
        yield* this.auditLogger.logAccessControlChange(
          "access_policy_revoked", "unknown" , "revoke" , user, dto.revokedFrom, "success",
          { revokedFrom: dto.revokedFrom, documentId: dto.documentId })
        return true as unknown as never
      }.bind(this))
      return withAppErrorBoundary(eff)
    })
  }

  checkAccess(
    input: CheckAccessDTOEncoded,
    user: UserContext
  ) {
    return withTiming("AccessPolicy:checkAccess", {
      correlationId: user.correlationId,
      userId: user.userId,
      workspaceId: user.workspaceId,
    }, async () => {
      const eff = E.gen(function* (this: AccessPolicyWorkflow) {
        const dto = yield* S.decodeUnknown(CheckAccessDTOSchema)(input)
        const allowed = yield* this.accessRepo.hasPermission(dto.documentId, dto.userId, dto.action)
        yield* this.auditLogger.logAccessControlChange(
          allowed ? "access_check_allowed" : "access_check_denied", "unknown", "check",
          user, dto.userId, allowed ? "success" : "failure",
          { userId: dto.userId, action: dto.action, documentId: dto.documentId }
        )
        if (!allowed) {
          return yield* E.fail(
            AccessPolicyValidationError.forField(
              "access",
              `${dto.userId}:${dto.documentId}:${dto.action}`,
              "Access denied"
            )
          )
        }
        return allowed as unknown as never
      }.bind(this))
      return withAppErrorBoundary(eff)
    })
  }
}
