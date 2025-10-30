import { container } from "tsyringe"
import { TOKENS } from "./tokens"

// Domain repositories
import { DocumentRepository } from "@/app/domain/document/repository"
import { DocumentVersionRepository } from "@/app/domain/d-version/repository"
import { AccessPolicyRepository } from "@/app/domain/access-policy/repository"
import { DownloadTokenRepository } from "@/app/domain/download-token/repository"

// Infrastructure implementations
import { DocumentDrizzleRepository } from "@/app/infrastructure/repositories/implementations/d.repository"
import { DocumentVersionDrizzleRepository } from "@/app/infrastructure/repositories/implementations/d-version.repository"
import { AccessPolicyDrizzleRepository } from "@/app/infrastructure/repositories/implementations/access-policy.repository"
import { DownloadTokenDrizzleRepository } from "@/app/infrastructure/repositories/implementations/download-token-repository"
import { LocalStorageService } from "@/app/infrastructure/storage/local-storage"

// Application services
import { AccessControlService } from "@/app/application/services/access-control.service"
import { AuditLoggerService } from "@/app/application/services/audit-logger.service"

// Application workflows
import { DocumentWorkflow } from "@/app/application/workflows/doc.workflow"
import { UploadWorkflow } from "@/app/application/workflows/upload.workflow"
import { AccessPolicyWorkflow } from "@/app/application/workflows/access-policy.workflow"
import { DownloadTokenWorkflow } from "@/app/application/workflows/download-token.workflow"

// Re-export TOKENS for convenience
// Re-export TOKENS for convenience
export { TOKENS, container }

// Register repositories
container.register(TOKENS.DOCUMENT_REPOSITORY, { useClass: DocumentDrizzleRepository })
container.register(TOKENS.DOCUMENT_VERSION_REPOSITORY, { useClass: DocumentVersionDrizzleRepository })
container.register(TOKENS.ACCESS_POLICY_REPOSITORY, { useClass: AccessPolicyDrizzleRepository })
container.register(TOKENS.DOWNLOAD_TOKEN_REPOSITORY, { useClass: DownloadTokenDrizzleRepository })
container.register(TOKENS.STORAGE_SERVICE, { useClass: LocalStorageService })

// Register services
container.register(TOKENS.ACCESS_CONTROL_SERVICE, { useClass: AccessControlService })
container.register(TOKENS.AUDIT_LOGGER_SERVICE, { useClass: AuditLoggerService })

// Register workflows
container.register(TOKENS.DOCUMENT_WORKFLOW, { useClass: DocumentWorkflow })
container.register(TOKENS.UPLOAD_WORKFLOW, { useClass: UploadWorkflow })
container.register(TOKENS.ACCESS_POLICY_WORKFLOW, { useClass: AccessPolicyWorkflow })
container.register(TOKENS.DOWNLOAD_TOKEN_WORKFLOW, { useClass: DownloadTokenWorkflow })
