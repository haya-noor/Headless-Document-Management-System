import "reflect-metadata"
import { inject, injectable } from "tsyringe"
import { Effect as E, pipe, Schema as S, Option as O } from "effect"
import crypto from "crypto"
import { TOKENS } from "@/app/infrastructure/di/container"
import { AccessPolicyRepository } from "@/app/domain/access-policy/repository"
import { DocumentRepository } from "@/app/domain/document/repository"
import { GrantAccessDTOSchema, GrantAccessDTOEncoded } from "@/app/application/dtos/access-policy/grant-access.dto"
import { RevokeAccessDTOSchema, RevokeAccessDTOEncoded } from "@/app/application/dtos/access-policy/revoke-access.dto"
import { CheckAccessDTOSchema, CheckAccessDTOEncoded } from "@/app/application/dtos/access-policy/check-access.dto"
import { AccessPolicyEntity } from "@/app/domain/access-policy/entity"
import { AccessPolicyValidationError } from "@/app/domain/access-policy/errors"
import { DocumentNotFoundError } from "@/app/domain/document/errors"
import { BusinessRuleViolationError } from "@/app/domain/shared/base.errors"
import { GrantAccessBuilder } from "@/app/application/dtos/access-policy/grant-access-builder"
import { AccessPolicyGuards } from "@/app/domain/access-policy/guards"
import type { UserContext } from "@/app/application/services/access-control.service"


/*
TOKEN.ACCESS_POLICY_REPOSITORY: is a key to access the AccessPolicyRepository implementation.

All the keys are defined in di/container.ts file. and with each key we have a corresponding 
implementation class. like AccessPolicyRepositoryImpl is the implementation of the 
AccessPolicyRepository interface.

we're doing dependency injection here. so we're injecting the AccessPolicyRepository 
implementation into the AccessPolicyWorkflow class.

Benefit:  
Each layer concerns stays separated. like in application layer we are using the 
AccessPolicyRepository interface to perform the operations. and in infrastructure layer we are 
implementing the interface. 

GrantAccessDTOEncoded: raw input, from http request (it has string based ids, not uuids)
S.decodeUnknown(GrantAccessDTOSchema)(input): uses effect schema to validate the input 
against schema, decode string -> uuid and return Effect.Effect<GrantAccessDTO, ParseError, 
never>  where GrantAccessDTO has validated values (like uuid)

if validation succeeds, continue with the business logic (create the access policy entity) by 
calling AccessPolicyEntity.create(dto)
.Create(dto) uses the dto to build a valid AccessPolicyEntity. Once the 
AccessPolicyEntity is created, pass it to app layer respositry interface: 
this.accessRepo.add(policy), this.accessRepo is injected via 
DI (dependency injection) (accessPolicyRepository) in the constructor. 

*/
@injectable()
export class AccessPolicyWorkflow {
  constructor(
    @inject(TOKENS.ACCESS_POLICY_REPOSITORY)
    private readonly accessRepo: AccessPolicyRepository,
    @inject(TOKENS.DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository
  ) {}

  /**
   * Grant access using builder pattern
   * Owner can grant update permission to users
   */
  grantAccessWithBuilder(
    builder: GrantAccessBuilder,
    owner: UserContext
  ): E.Effect<AccessPolicyEntity, AccessPolicyValidationError | DocumentNotFoundError | BusinessRuleViolationError> {
    const dto = builder.build()
    
    return pipe(
      // Verify document exists
      this.documentRepo.findById(dto.documentId),
      E.flatMap((option) =>
        O.match(option, {
          onNone: () => E.fail(new DocumentNotFoundError({
            resource: "Document",
            id: String(dto.documentId),
            message: `Document ${dto.documentId} not found`
          })),
          onSome: (doc) => {
            // Verify owner has permission to grant access
            if (doc.ownerId !== owner.userId && !owner.roles.includes("admin")) {
              return E.fail(new BusinessRuleViolationError({
                message: "Only document owner or admin can grant access",
                code: "ACCESS_DENIED",
                context: { documentId: dto.documentId, ownerId: owner.userId }
              }))
            }

            // Normalize actions (convert "update" to "write" for storage)
            const normalizedActions = AccessPolicyGuards.normalizeActions(dto.actions as any)
            const now = new Date().toISOString()
            
            const policyData = {
              id: crypto.randomUUID(),
              name: `Access to document ${dto.documentId}`,
              description: `Granted by ${owner.userId} to ${dto.grantedTo}`,
              subjectType: "user" as const,
              subjectId: dto.grantedTo,
              resourceType: "document" as const,
              resourceId: dto.documentId,
              actions: normalizedActions,
              isActive: true,
              priority: dto.priority,
              createdAt: now,
              updatedAt: now
            }

            return AccessPolicyEntity.create(policyData).pipe(
              E.flatMap((policy) => this.accessRepo.save(policy))
            )
          }
        })
      )
    )
  }

  /**
   * Grant access (original method - kept for backward compatibility)
   * Enhanced to support owner verification and "update" permission
   */
  grantAccess(input: GrantAccessDTOEncoded, owner: UserContext): E.Effect<AccessPolicyEntity, AccessPolicyValidationError | DocumentNotFoundError | BusinessRuleViolationError | ParseResult.ParseError, never> {
    return pipe(
      S.decodeUnknown(GrantAccessDTOSchema)(input),
      E.flatMap((dto: any) => {
        // Verify document exists and owner can grant
        return this.documentRepo.findById(dto.documentId).pipe(
          E.flatMap((option) =>
            O.match(option, {
              onNone: () => E.fail(new DocumentNotFoundError({
                resource: "Document",
                id: String(dto.documentId),
                message: `Document ${dto.documentId} not found`
              })),
              onSome: (doc) => {
                // Verify owner has permission to grant access
                if (doc.ownerId !== owner.userId && !owner.roles.includes("admin")) {
                  return E.fail(new BusinessRuleViolationError({
                    message: "Only document owner or admin can grant access",
                    code: "ACCESS_DENIED",
                    context: { documentId: dto.documentId, ownerId: owner.userId }
                  }))
                }

                // Normalize actions (convert "update" to "write" for storage)
                const normalizedActions = AccessPolicyGuards.normalizeActions(dto.actions as any)
                const now = new Date().toISOString()
                
                const policyData = {
                  id: crypto.randomUUID(),
                  name: `Access to document ${dto.documentId}`,
                  description: `Granted by ${owner.userId} to ${dto.grantedTo}`,
                  subjectType: "user" as const,
                  subjectId: dto.grantedTo,
                  resourceType: "document" as const,
                  resourceId: dto.documentId,
                  actions: normalizedActions,
                  isActive: true,
                  priority: dto.priority,
                  createdAt: now,
                  updatedAt: now
                }

                return AccessPolicyEntity.create(policyData).pipe(
                  E.flatMap((policy) => this.accessRepo.save(policy))
                )
              }
            })
          )
        )
      })
    )
  }

  revokeAccess(input: RevokeAccessDTOEncoded) {
    return pipe(
      S.decodeUnknown(RevokeAccessDTOSchema)(input),
      E.flatMap((dto) => this.accessRepo.remove(dto.documentId, dto.revokedFrom))
    )
  }

  checkAccess(input: CheckAccessDTOEncoded) {
    return pipe(
      S.decodeUnknown(CheckAccessDTOSchema)(input),
      E.flatMap((dto) =>
        this.accessRepo.hasPermission(dto.documentId, dto.userId, dto.action).pipe(
          E.filterOrFail(
            (allowed) => allowed,
            () => AccessPolicyValidationError.forField("access", `${dto.userId}:${dto.documentId}:${dto.action}`, "Access denied")
          )
        )
      )
    )
  }
}
