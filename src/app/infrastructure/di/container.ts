import { container } from "tsyringe"

import { DocumentRepository } from "@/app/domain/document/repository"
import { DocumentVersionRepository } from "@/app/domain/d-version/repository"
import { AccessPolicyRepository } from "@/app/domain/access-policy/repository"
import { DownloadTokenRepository } from "@/app/domain/download-token/repository"
import { AuditLogRepository } from "@/app/domain/audit-log/repository"

import { DocumentDrizzleRepository } from "@/app/infrastructure/repositories/implementations/d.repository"
import { DocumentVersionDrizzleRepository } from "@/app/infrastructure/repositories/implementations/d-version.repository"
import { AccessPolicyDrizzleRepository } from "@/app/infrastructure/repositories/implementations/access-policy.repository"
import { DownloadTokenDrizzleRepository } from "@/app/infrastructure/repositories/implementations/download-token-repository"
import { AuditLogDrizzleRepository } from "@/app/infrastructure/repositories/implementations/audit-log.repository"
import { LocalStorageService } from "@/app/infrastructure/storage/local-storage"
import { AccessControlService } from "@/app/application/services/access-control.service"
import { AuditLoggerService } from "@/app/application/services/audit-logger.service"
import { DocumentWorkflow } from "@/app/application/workflows/doc.workflow"
import { UploadWorkflow } from "@/app/application/workflows/upload.workflow"
import { AccessPolicyWorkflow } from "@/app/application/workflows/access-policy.workflow"
import { DownloadTokenWorkflow } from "@/app/application/workflows/download-token.workflow"

export const TOKENS = {
  DOCUMENT_REPOSITORY: Symbol.for("DOCUMENT_REPOSITORY"),
  DOCUMENT_VERSION_REPOSITORY: Symbol.for("DOCUMENT_VERSION_REPOSITORY"),
  ACCESS_POLICY_REPOSITORY: Symbol.for("ACCESS_POLICY_REPOSITORY"),
  DOWNLOAD_TOKEN_REPOSITORY: Symbol.for("DOWNLOAD_TOKEN_REPOSITORY"),
  AUDIT_LOG_REPOSITORY: Symbol.for("AUDIT_LOG_REPOSITORY"),
  STORAGE_SERVICE: Symbol.for("STORAGE_SERVICE"),
  ACCESS_CONTROL_SERVICE: Symbol.for("ACCESS_CONTROL_SERVICE"),
  AUDIT_LOGGER_SERVICE: Symbol.for("AUDIT_LOGGER_SERVICE"),
  DOCUMENT_WORKFLOW: Symbol.for("DOCUMENT_WORKFLOW"),
  UPLOAD_WORKFLOW: Symbol.for("UPLOAD_WORKFLOW"),
  ACCESS_POLICY_WORKFLOW: Symbol.for("ACCESS_POLICY_WORKFLOW"),
  DOWNLOAD_TOKEN_WORKFLOW: Symbol.for("DOWNLOAD_TOKEN_WORKFLOW"),
} as const

container.register(TOKENS.DOCUMENT_REPOSITORY, { useClass: DocumentDrizzleRepository })
container.register(TOKENS.DOCUMENT_VERSION_REPOSITORY, { useClass: DocumentVersionDrizzleRepository })
container.register(TOKENS.ACCESS_POLICY_REPOSITORY, { useClass: AccessPolicyDrizzleRepository })
container.register(TOKENS.DOWNLOAD_TOKEN_REPOSITORY, { useClass: DownloadTokenDrizzleRepository })
container.register(TOKENS.AUDIT_LOG_REPOSITORY, { useClass: AuditLogDrizzleRepository })
container.register(TOKENS.STORAGE_SERVICE, { useClass: LocalStorageService })
container.register(TOKENS.ACCESS_CONTROL_SERVICE, { useClass: AccessControlService })
container.register(TOKENS.AUDIT_LOGGER_SERVICE, { useClass: AuditLoggerService })
container.register(TOKENS.DOCUMENT_WORKFLOW, { useClass: DocumentWorkflow })
container.register(TOKENS.UPLOAD_WORKFLOW, { useClass: UploadWorkflow })
container.register(TOKENS.ACCESS_POLICY_WORKFLOW, { useClass: AccessPolicyWorkflow })
container.register(TOKENS.DOWNLOAD_TOKEN_WORKFLOW, { useClass: DownloadTokenWorkflow })
