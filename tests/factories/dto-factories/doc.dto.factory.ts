// File: tests/factories/dto/document.dto.factory.ts
import { faker } from "@faker-js/faker";
import { CreateDocumentDTOEncoded } from "@/app/application/dtos/document/create-doc.dto";
import { ConfirmUploadDTOEncoded } from "@/app/application/dtos/upload/confirm-upload.dto";
import { PublishDocumentDTOEncoded } from "@/app/application/dtos/document/publish-doc.dto";
import { GrantAccessDTOEncoded } from "@/app/application/dtos/access-policy/grant-access.dto";
import { CheckAccessDTOEncoded } from "@/app/application/dtos/access-policy/check-access.dto";
import { CreateDownloadTokenDTOEncoded } from "@/app/application/dtos/download-token/create-token.dto";
import { ValidateDownloadTokenDTOEncoded } from "@/app/application/dtos/download-token/validate-token.dto";
import { RevokeAccessDTOEncoded } from "@/app/application/dtos/access-policy/revoke-access.dto";
import { QueryDocumentsDTOEncoded } from "@/app/application/dtos/document/query-doc.dto";
import { UpdateDocumentDTOEncoded } from "@/app/application/dtos/document/update-doc.dto";
import { InitiateUploadDTOEncoded } from "@/app/application/dtos/upload/initiate-upload.dto";

export function makeCreateDocumentDto(overrides: Partial<CreateDocumentDTOEncoded> = {}): CreateDocumentDTOEncoded {
  return {
    ownerId: overrides.ownerId ?? faker.string.uuid(),
    title: overrides.title ?? faker.system.fileName(),
    description: overrides.description ?? faker.lorem.sentence(),
    tags: overrides.tags ?? [faker.lorem.word()]
  };
}

export function makeConfirmUploadDto(overrides: Partial<ConfirmUploadDTOEncoded> = {}): ConfirmUploadDTOEncoded {
  return {
    documentId: overrides.documentId ?? faker.string.uuid(),
    userId: overrides.userId ?? faker.string.uuid(),
    mimeType: overrides.mimeType ?? "application/pdf",
    size: overrides.size ?? 1024,
    storageKey: overrides.storageKey ?? faker.system.filePath(),
    checksum: overrides.checksum ?? faker.string.alphanumeric(64)
  };
}

export function makePublishDocumentDto(overrides: Partial<PublishDocumentDTOEncoded> = {}): PublishDocumentDTOEncoded {
  return {
    documentId: overrides.documentId ?? faker.string.uuid(),
    userId: overrides.userId ?? faker.string.uuid()
  };
}

export function makeGrantAccessDto(overrides: Partial<GrantAccessDTOEncoded> = {}): GrantAccessDTOEncoded {
  return {
    documentId: overrides.documentId ?? faker.string.uuid(),
    grantedTo: overrides.grantedTo ?? faker.string.uuid(),
    grantedBy: overrides.grantedBy ?? faker.string.uuid(),
    actions: overrides.actions ?? ["read"],
    priority: overrides.priority ?? 1
  };
}

export function makeCheckAccessDto(overrides: Partial<CheckAccessDTOEncoded> = {}): CheckAccessDTOEncoded {
  return {
    documentId: overrides.documentId ?? faker.string.uuid(),
    userId: overrides.userId ?? faker.string.uuid(),
    action: overrides.action ?? "read",
    actions: overrides.actions ?? ["read"]
  };
}

export function makeCreateTokenDto(overrides: Partial<CreateDownloadTokenDTOEncoded> = {}): CreateDownloadTokenDTOEncoded {
  return {
    documentId: overrides.documentId ?? faker.string.uuid(),
    issuedTo: overrides.issuedTo ?? faker.string.uuid(),
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 5 * 60 * 1000)
  };
}

export function makeValidateTokenDto(overrides: Partial<ValidateDownloadTokenDTOEncoded> = {}): ValidateDownloadTokenDTOEncoded {
  return {
    tokenId: overrides.tokenId ?? faker.string.uuid(),
    userId: overrides.userId ?? faker.string.uuid(),
    issuedTo: overrides.issuedTo ?? faker.string.uuid()
  };
}

export function makeRevokeAccessDto(overrides: Partial<RevokeAccessDTOEncoded> = {}): RevokeAccessDTOEncoded {
  return {
    documentId: overrides.documentId ?? faker.string.uuid(),
    revokedFrom: overrides.revokedFrom ?? faker.string.uuid(),
    revokedBy: overrides.revokedBy ?? faker.string.uuid(),
    subjectId: overrides.subjectId ?? faker.string.uuid()
  };
}

export function makeQueryDocumentsDto(overrides: Partial<QueryDocumentsDTOEncoded> = {}): QueryDocumentsDTOEncoded {
  return {
    ownerId: overrides.ownerId ?? faker.string.uuid(),
    page: overrides.page ?? 1,
    limit: overrides.limit ?? 10,
    search: overrides.search ?? undefined,
    tag: overrides.tag ?? undefined
  };
}

export function makeUpdateDocumentDto(overrides: Partial<UpdateDocumentDTOEncoded> = {}): UpdateDocumentDTOEncoded {
  return {
    id: overrides.id ?? faker.string.uuid(),
    title: overrides.title ?? undefined,
    description: overrides.description ?? undefined,
    tags: overrides.tags ?? undefined
  };
}

export function makeInitiateUploadDto(overrides: Partial<InitiateUploadDTOEncoded> = {}): InitiateUploadDTOEncoded {
  return {
    documentId: overrides.documentId ?? faker.string.uuid(),
    filename: overrides.filename ?? faker.system.fileName(),
    mimeType: overrides.mimeType ?? "application/pdf",
    size: overrides.size ?? 1024,
    userId: overrides.userId ?? faker.string.uuid(),
  };
}


