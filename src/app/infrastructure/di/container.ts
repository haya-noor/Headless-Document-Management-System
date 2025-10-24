import { container } from "tsyringe"

import { DocumentRepository } from "@/app/domain/document/repository"
import { DocumentVersionRepository } from "@/app/domain/d-version/repository"
import { AccessPolicyRepository } from "@/app/domain/access-policy/repository"
import { DownloadTokenRepository } from "@/app/domain/download-token/repository"

import { DocumentDrizzleRepository } from "@/app/infrastructure/repositories/implementations/d.repository"
import { DocumentVersionDrizzleRepository } from "@/app/infrastructure/repositories/implementations/d-version.repository"
import { AccessPolicyDrizzleRepository } from "@/app/infrastructure/repositories/implementations/access-policy.repository"
import { DownloadTokenDrizzleRepository } from "@/app/infrastructure/repositories/implementations/download-token-repository"
import { LocalStorageService } from "@/app/infrastructure/storage/local-storage"

export const TOKENS = {
  DOCUMENT_REPOSITORY: Symbol.for("DOCUMENT_REPOSITORY"),
  DOCUMENT_VERSION_REPOSITORY: Symbol.for("DOCUMENT_VERSION_REPOSITORY"),
  ACCESS_POLICY_REPOSITORY: Symbol.for("ACCESS_POLICY_REPOSITORY"),
  DOWNLOAD_TOKEN_REPOSITORY: Symbol.for("DOWNLOAD_TOKEN_REPOSITORY"),
  STORAGE_SERVICE: Symbol.for("STORAGE_SERVICE")
} as const

container.register(TOKENS.DOCUMENT_REPOSITORY, { useClass: DocumentDrizzleRepository })
container.register(TOKENS.DOCUMENT_VERSION_REPOSITORY, { useClass: DocumentVersionDrizzleRepository })
container.register(TOKENS.ACCESS_POLICY_REPOSITORY, { useClass: AccessPolicyDrizzleRepository })
container.register(TOKENS.DOWNLOAD_TOKEN_REPOSITORY, { useClass: DownloadTokenDrizzleRepository })
container.register(TOKENS.STORAGE_SERVICE, { useClass: LocalStorageService })
