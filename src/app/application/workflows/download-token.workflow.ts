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

@injectable()
export class DownloadTokenWorkflow {
  constructor(
    @inject(TOKENS.DOWNLOAD_TOKEN_REPOSITORY)
    private readonly tokenRepo: DownloadTokenRepository
  ) {}

  /**
   * Create a new download token
   */
  createToken(input: CreateDownloadTokenDTOEncoded) {
    return pipe(
      S.decodeUnknown(CreateDownloadTokenDTOSchema)(input),
      E.flatMap((dto) => {
        const now = new Date().toISOString();
        const tokenData = {
          id: crypto.randomUUID(),
          token: crypto.randomBytes(32).toString('hex'),
          documentId: dto.documentId,
          issuedTo: dto.issuedTo,
          expiresAt: dto.expiresAt instanceof Date ? dto.expiresAt : new Date(dto.expiresAt),
          createdAt: now,
          updatedAt: now
        };
        return DownloadTokenEntity.create(tokenData).pipe(
          E.flatMap((token) => this.tokenRepo.save(token))
        );
      })
    )
  }

  /**
   * Validate token (ensure existence, ownership, expiry, mark as used)
   */
  validateToken(input: ValidateDownloadTokenDTOEncoded) {
    return pipe(
      S.decodeUnknown(ValidateDownloadTokenDTOSchema)(input),
      E.flatMap((dto) => this.tokenRepo.fetchById(dto.tokenId).pipe(
          // Step 1: Handle Option
          E.flatMap((maybeToken) => O.match(maybeToken, {
              onNone: () => E.fail(new DownloadTokenValidationError({ message: "Token not found" })),
              onSome: (token) =>
                // Step 2: Domain-level validation
                 token.validateUsage(dto.userId).pipe(
                   // Step 3: Mark token as used
                   E.flatMap((validated) => this.tokenRepo.update(validated as DownloadTokenEntity))
                )
            })
          )
        )
      )
    )
  }
}
