import "reflect-metadata"
import { inject, injectable } from "tsyringe"
import { Effect as E, pipe, Schema as S } from "effect"
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

@injectable()
export class AccessPolicyWorkflow {
  constructor(
    @inject(TOKENS.ACCESS_POLICY_REPOSITORY)
    private readonly accessRepo: AccessPolicyRepository,

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
      return pipe(
        S.decodeUnknown(GrantAccessDTOSchema)(input),
        E.flatMap((dto) =>
          this.accessControl
            .enforceAccess(user, "accessPolicy", "grant", { workspaceId: user.workspaceId })
            .pipe(
              E.flatMap(() => {
                const now = new Date().toISOString()
                const policyData = {
                  id: crypto.randomUUID(),
                  name: `Access to document ${dto.documentId}`,
                  description: `Granted by ${user.userId} to ${dto.grantedTo}`,
                  subjectType: "user" as const,
                  subjectId: dto.grantedTo,
                  resourceType: "document" as const,
                  resourceId: dto.documentId,
                  actions: dto.actions,
                  isActive: true,
                  priority: dto.priority,
                  createdAt: now,
                  updatedAt: now
                }

                return AccessPolicyEntity.create(policyData).pipe(
                  E.flatMap((policy) => this.accessRepo.save(policy)),
                  E.tap((policy) =>
                    this.auditLogger.logAccessControlChange(
                      "access_policy_granted",
                      policy.id,
                      "grant",
                      user,
                      dto.grantedTo,
                      "success",
                      { grantedTo: dto.grantedTo, actions: dto.actions }
                    )
                  ),
                  E.tapError((err) =>
                    this.auditLogger.logAccessControlChange(
                      "access_policy_grant_failed",
                      "unknown",
                      "grant",
                      user,
                      dto.grantedTo,
                      "failure",
                      undefined,
                      String(err)
                    )
                  )
                )
              })
            )
        )
      )
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
      return pipe(
        S.decodeUnknown(RevokeAccessDTOSchema)(input),
        E.flatMap((dto) =>
          this.accessControl
            .enforceAccess(user, "accessPolicy", "revoke", { workspaceId: user.workspaceId })
            .pipe(
              E.flatMap(() => this.accessRepo.remove(dto.documentId, dto.revokedFrom)),
              E.tap(() =>
                this.auditLogger.logAccessControlChange(
                  "access_policy_revoked",
                  "unknown",
                  "revoke",
                  user,
                  dto.revokedFrom,
                  "success",
                  { revokedFrom: dto.revokedFrom, documentId: dto.documentId }
                )
              ),
              E.tapError((err) =>
                this.auditLogger.logAccessControlChange(
                  "access_policy_revoke_failed",
                  "unknown",
                  "revoke",
                  user,
                  dto.revokedFrom,
                  "failure",
                  undefined,
                  String(err)
                )
              )
            )
        )
      )
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
      return pipe(
        S.decodeUnknown(CheckAccessDTOSchema)(input),
        E.flatMap((dto) =>
          this.accessRepo.hasPermission(dto.documentId, dto.userId, dto.action).pipe(
            E.tap((allowed) =>
              this.auditLogger.logAccessControlChange(
                allowed ? "access_check_allowed" : "access_check_denied",
                "unknown",
                "check",
                user,
                dto.userId,
                allowed ? "success" : "failure",
                { userId: dto.userId, action: dto.action, documentId: dto.documentId }
              )
            ),
            E.filterOrFail(
              (allowed) => allowed,
              () =>
                AccessPolicyValidationError.forField(
                  "access",
                  `${dto.userId}:${dto.documentId}:${dto.action}`,
                  "Access denied"
                )
            )
          )
        )
      )
    })
  }
}
