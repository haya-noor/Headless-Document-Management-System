import "reflect-metadata"
import { inject, injectable } from "tsyringe"
import { Effect as E, pipe, Schema as S } from "effect"
import crypto from "crypto"
import { TOKENS } from "@/app/infrastructure/di/container"
import { AccessPolicyRepository } from "@/app/domain/access-policy/repository"
import { GrantAccessDTOSchema, GrantAccessDTOEncoded } from "@/app/application/dtos/access-policy/grant-access.dto"
import { RevokeAccessDTOSchema, RevokeAccessDTOEncoded } from "@/app/application/dtos/access-policy/revoke-access.dto"
import { CheckAccessDTOSchema, CheckAccessDTOEncoded } from "@/app/application/dtos/access-policy/check-access.dto"
import { AccessPolicyEntity } from "@/app/domain/access-policy/entity"
import { AccessPolicyValidationError } from "@/app/domain/access-policy/errors"


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
    private readonly accessRepo: AccessPolicyRepository
  ) {}

  grantAccess(input: GrantAccessDTOEncoded) {
    return pipe(
      S.decodeUnknown(GrantAccessDTOSchema)(input),
      E.flatMap((dto) => {
        const now = new Date().toISOString();
        const policyData = {
          id: crypto.randomUUID(),
          name: `Access to document ${dto.documentId}`,
          description: `Granted by ${dto.grantedBy} to ${dto.grantedTo}`,
          subjectType: "user" as const,
          subjectId: dto.grantedTo,
          resourceType: "document" as const,
          resourceId: dto.documentId,
          actions: dto.actions,
          isActive: true,
          priority: dto.priority,
          createdAt: now,
          updatedAt: now
        };
        return AccessPolicyEntity.create(policyData).pipe(
          E.flatMap((policy) => this.accessRepo.save(policy))
        );
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
