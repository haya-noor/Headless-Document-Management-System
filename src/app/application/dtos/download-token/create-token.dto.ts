import { Schema as S } from "effect"
import { DocumentId, UserId } from "@/app/domain/refined/uuid"
import { DownloadTokenFields } from "@/app/domain/download-token/schema"

export const CreateDownloadTokenDTOSchema = DownloadTokenFields
  .pick("documentId", "issuedTo", "expiresAt")
  .pipe(S.extend(S.Struct({})))
export type CreateDownloadTokenDTO = S.Schema.Type<typeof CreateDownloadTokenDTOSchema>
export type CreateDownloadTokenDTOEncoded = S.Schema.Encoded<typeof CreateDownloadTokenDTOSchema>
