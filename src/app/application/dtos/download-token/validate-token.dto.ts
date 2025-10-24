import { Schema as S } from "effect"
import { DownloadTokenId, UserId } from "@/app/domain/refined/uuid"
import { DownloadTokenFields } from "@/app/domain/download-token/schema"

export const ValidateDownloadTokenDTOSchema = DownloadTokenFields
  .pick("issuedTo")
  .pipe(S.extend(S.Struct({
    tokenId: DownloadTokenId,
    userId: UserId
  })))
export type ValidateDownloadTokenDTO = S.Schema.Type<typeof ValidateDownloadTokenDTOSchema>
export type ValidateDownloadTokenDTOEncoded = S.Schema.Encoded<typeof ValidateDownloadTokenDTOSchema>
