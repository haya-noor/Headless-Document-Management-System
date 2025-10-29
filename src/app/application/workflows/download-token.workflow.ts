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

@injectable()
export class DownloadTokenWorkflow {
  constructor(
    @inject(TOKENS.DOWNLOAD_TOKEN_REPOSITORY)
    private readonly tokenRepo: DownloadTokenRepository,

    @inject(TOKENS.ACCESS_CONTROL_SERVICE)
    private readonly accessControl: AccessControlService,

    @inject(TOKENS.AUDIT_LOGGER_SERVICE)
    private readonly auditLogger: AuditLoggerService
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
      return pipe(
        S.decodeUnknown(CreateDownloadTokenDTOSchema)(input),
        E.flatMap((dto) =>
          // user has read access to the document
          this.accessControl.enforceAccess(user, "document", "read", {
            workspaceId: user.workspaceId
          }).pipe(
            E.flatMap(() => {
              // create a new token
              const now = new Date().toISOString()
              const tokenData = {
                id: crypto.randomUUID(),
                token: crypto.randomBytes(32).toString("hex"),
                documentId: dto.documentId,
                issuedTo: dto.issuedTo,
                expiresAt:
                  dto.expiresAt instanceof Date ? dto.expiresAt : new Date(dto.expiresAt),
                createdAt: now,
                updatedAt: now
              }

              return DownloadTokenEntity.create(tokenData).pipe(
                E.flatMap((token) => this.tokenRepo.save(token)),
                //  Audit success
                E.tap((token) =>
                  this.auditLogger.logSecurityEvent(
                    "token_created",
                    user,
                    "success",
                    {
                      tokenId: token.id,
                      documentId: dto.documentId,
                      issuedTo: dto.issuedTo
                    }
                  )
                ),
                // Audit failure
                E.tapError((err) =>
                  this.auditLogger.logSecurityEvent(
                    "token_create_failed",
                    user,
                    "failure",
                    {
                      action: "create-download-token"
                    },
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

  /**
   * Validate token (ensure it exists, is valid, and is marked used)
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
      return pipe(
        S.decodeUnknown(ValidateDownloadTokenDTOSchema)(input),
        E.flatMap((dto) =>
          this.tokenRepo.fetchById(dto.tokenId).pipe(
            E.flatMap((maybeToken) =>
              O.match(maybeToken, {
                onNone: () =>
                  pipe(
                    this.auditLogger.logSecurityEvent(
                      "token_validation_failed_not_found",
                      user,
                      "failure",
                      {
                        tokenId: dto.tokenId
                      }
                    ),
                    E.flatMap(() =>
                      E.fail(
                        DownloadTokenValidationError.forField(
                          "tokenId",
                          dto.tokenId,
                          "Token not found"
                        )
                      )
                    )
                  ),
                onSome: (token) =>
                  token.validateUsage(dto.userId).pipe(
                    E.flatMap((validated) => this.tokenRepo.update(validated)),
                    //  Audit success
                    E.tap(() =>
                      this.auditLogger.logSecurityEvent(
                        "token_validated",
                        user,
                        "success",
                        {
                          tokenId: dto.tokenId,
                          documentId: token.documentId
                        }
                      )
                    ),
                    // Audit failure
                    E.tapError((err) =>
                      this.auditLogger.logSecurityEvent(
                        "token_validation_failed",
                        user,
                        "failure",
                        {
                          tokenId: dto.tokenId
                        },
                        String(err)
                      )
                    )
                  )
              })
            )
          )
        )
      )
    })
  }
}
