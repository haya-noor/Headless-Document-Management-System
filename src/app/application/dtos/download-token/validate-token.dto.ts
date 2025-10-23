import { Schema as S } from "effect"
import { DownloadTokenId, UserId } from "@/app/domain/refined/uuid"

export const ValidateDownloadTokenDTOSchema = S.Struct({
  tokenId: DownloadTokenId,
  userId: UserId
})
export type ValidateDownloadTokenDTO = S.Schema.Type<typeof ValidateDownloadTokenDTOSchema>
export type ValidateDownloadTokenDTOEncoded = S.Schema.Encoded<typeof ValidateDownloadTokenDTOSchema>
