import "reflect-metadata"
import { inject, injectable } from "tsyringe"
import { Effect as E, pipe, Schema as S, Option as O } from "effect"
import crypto from "crypto"

import { TOKENS } from "@/app/infrastructure/di/container"
import { DownloadTokenRepository } from "@/app/domain/download-token/repository"
import { CreateDownloadTokenDTOSchema, CreateDownloadTokenDTOEncoded } from "@/app/application/dtos/download-token/create-token.dto"
import { ValidateDownloadTokenDTOSchema, ValidateDownloadTokenDTOEncoded } from "@/app/application/dtos/download-token/validate-token.dto"
import { DownloadTokenEntity } from "@/app/domain/download-token/entity"
import { DownloadTokenValidationError } from "@/app/domain/download-token/errors"
import { AccessControlService } from "@/app/application/services/access-control.service"
import { AuditLoggerService } from "@/app/application/services/audit-logger.service"
import { UserContext } from "@/presentation/http/orpc/auth"
import { withTiming } from "@/app/application/utils/timed-logger" 
import { withAppErrorBoundary } from "@/app/application/utils/application-error"
import { initializeEntityDefaults } from "@/app/domain/shared/schema.utils"
import { DocumentRepository } from "@/app/domain/document/repository"

@injectable()
export class DownloadTokenWorkflow {
  constructor(
    @inject(TOKENS.DOWNLOAD_TOKEN_REPOSITORY)
    private readonly tokenRepo: DownloadTokenRepository,

    @inject(TOKENS.ACCESS_CONTROL_SERVICE)
    private readonly accessControl: AccessControlService,

    @inject(TOKENS.AUDIT_LOGGER_SERVICE)
    private readonly auditLogger: AuditLoggerService,

    @inject(TOKENS.DOCUMENT_REPOSITORY)
    private readonly documentRepo: DocumentRepository
  ) {}

  /**
   * Create a new download token (requires access to document)
   */
  createToken(
    input: CreateDownloadTokenDTOEncoded,
    user: UserContext
  ) {
    return withTiming("DownloadToken:createToken", {
      correlationId: user.correlationId,
      userId: user.userId,
      workspaceId: user.workspaceId,
    }, async () => {
      const eff = E.gen(function* (this: DownloadTokenWorkflow) {
        // 1) Validate incoming payload against the DTO schema
        const dto = yield* S.decodeUnknown(CreateDownloadTokenDTOSchema)(input)

        // 2) caller must have READ rights on the document before issuing a token
        //    (Typically the owner or someone with equivalent permission.)
        // First, fetch the document to get the owner ID
        const docOpt = yield* this.documentRepo.findById(dto.documentId)
        if (O.isNone(docOpt)) {
          return yield* E.fail(new Error(`Document ${String(dto.documentId)} not found`))
        }
        const doc = docOpt.value
        yield* this.accessControl.requirePermission(user, "document", "read", { resourceId: dto.documentId, resourceOwnerId: doc.ownerId })
               
        // 3) Construct token data
        const tokenData = {
          ...initializeEntityDefaults(),
          token: crypto.randomBytes(32).toString("hex"),
          documentId: dto.documentId,

          // THIS IS WHERE THE OWNER ASSIGNS DOWNLOAD PERMISSION TO ANOTHER USER 
          // By setting `issuedTo` to the intended recipient's userId (from the validated DTO),
          // the owner delegates download capability to that user. The token later enforces that
          // only this specific user can redeem it.
          issuedTo: dto.issuedTo,
           // Expiry 
          expiresAt: dto.expiresAt instanceof Date ? dto.expiresAt : new Date(dto.expiresAt)
        }

        // 4) Domain validation & entity creation
        const token = yield* DownloadTokenEntity.create(tokenData)
        const saved = yield* this.tokenRepo.save(token)

        // 6) Audit trail: token created 
        yield* this.auditLogger.logSecurityEvent(
          "token_created", user, "success",
          { tokenId: saved.id, documentId: dto.documentId, issuedTo: dto.issuedTo }
        )
        return saved
      }.bind(this))
      return withAppErrorBoundary(eff)
    })
  }

  /**
   * Validate token (ensure it exists, is valid, and mark/use it if appropriate).
   * This is typically invoked when the recipient tries to download the document.
   */
  validateToken(
    input: ValidateDownloadTokenDTOEncoded,
    user: UserContext
  ) {
    return withTiming("DownloadToken:validateToken", {
      correlationId: user.correlationId,
      userId: user.userId,
      workspaceId: user.workspaceId,
    }, async () => {
      const eff = E.gen(function* (this: DownloadTokenWorkflow) {
        // 1) Validate incoming payload
        const dto = yield* S.decodeUnknown(ValidateDownloadTokenDTOSchema)(input)

        // 2) Fetch token by ID; fail fast if missing
        const maybeToken = yield* this.tokenRepo.fetchById(dto.tokenId)
        if (O.isNone(maybeToken)) {
          yield* this.auditLogger.logSecurityEvent(
            "token_validation_failed_not_found",
            user,
            "failure",
            { tokenId: dto.tokenId }
          )
          return yield* E.fail(
            DownloadTokenValidationError.forField("tokenId", dto.tokenId, "Token not found")
          )
        }
        const token = maybeToken.value


        // 3) Domain rule: enforce that the user redeeming the token is the one it was issued to,
        //    and that the token is still valid (not expired, not previously used, etc.)
        //    `validateUsage` is typically where the `issuedTo` match, expiry, and state 
        // checks happen.

        const validated = yield* token.validateUsage(dto.userId)
        const updated = yield* this.tokenRepo.update(validated)
        yield* this.auditLogger.logSecurityEvent(
          "token_validated",
          user,
          "success",
          { tokenId: dto.tokenId, documentId: token.documentId }
        )
        return updated
      }.bind(this))
      return withAppErrorBoundary(eff)
    })
  }
}
