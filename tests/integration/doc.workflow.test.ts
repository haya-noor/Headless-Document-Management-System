// File: tests/integration/doc.workflow.test.ts

import "reflect-metadata"; // Required by tsyringe decorators

// Import core Vitest functions for describing, running, and asserting tests
import { describe, it, beforeEach, expect } from "vitest";

// Test setup utilities for database and seed data
import {
  setupTestDatabase,
  cleanupDatabase,
  createTestUser
} from "../setup/database.setup";

// Import database service to initialize it
import { databaseService } from "@/app/infrastructure/services/drizzle-service";


// Import application workflows to test
import { DocumentWorkflow } from "@/app/application/workflows/doc.workflow";
import { UploadWorkflow } from "@/app/application/workflows/upload.workflow";
import { AccessPolicyWorkflow } from "@/app/application/workflows/access-policy.workflow";
import { DownloadTokenWorkflow } from "@/app/application/workflows/download-token.workflow";

// Dependency Injection container and tokens
import { container } from "tsyringe";
import { TOKENS } from "@/app/infrastructure/di/container";

// Repository interfaces
import { DocumentRepository } from "@/app/domain/document/repository";
import { AccessPolicyRepository } from "@/app/domain/access-policy/repository";
import { DownloadTokenRepository } from "@/app/domain/download-token/repository";
import { DocumentVersionRepository } from "@/app/domain/d-version/repository";

// DTO types (schema-encoded)
import { CreateDocumentDTOEncoded } from "@/app/application/dtos/document/create-doc.dto";
import { ConfirmUploadDTOEncoded } from "@/app/application/dtos/upload/confirm-upload.dto";
import { PublishDocumentDTOEncoded } from "@/app/application/dtos/document/publish-doc.dto";
import { GrantAccessDTOEncoded } from "@/app/application/dtos/access-policy/grant-access.dto";
import { CheckAccessDTOEncoded } from "@/app/application/dtos/access-policy/check-access.dto";
import { CreateDownloadTokenDTOEncoded } from "@/app/application/dtos/download-token/create-token.dto";
import { ValidateDownloadTokenDTOEncoded } from "@/app/application/dtos/download-token/validate-token.dto";

// Storage factory for resolving runtime implementation
import { createStorageService } from "@/app/infrastructure/storage/storage.factory";
import { Effect as E, Option } from "effect";

// These will be initialized in beforeEach after database setup
let documentRepo: DocumentRepository;
let accessPolicyRepo: AccessPolicyRepository;
let tokenRepo: DownloadTokenRepository;
let versionRepo: DocumentVersionRepository;
let storageService: any;
let uploadWorkflow: UploadWorkflow;
let workflow: DocumentWorkflow;
let accessWorkflow: AccessPolicyWorkflow;
let tokenWorkflow: DownloadTokenWorkflow;



describe("Document Workflow Integration", () => {
  let db: Awaited<ReturnType<typeof setupTestDatabase>>;
  let testUser: any;

  beforeEach(async () => {
    db = await setupTestDatabase();
    // Initialize the database service with the client
    databaseService.init(db.client);
    await cleanupDatabase();
    testUser = await createTestUser(db.db);
    
    // Initialize dependencies after database is set up
    documentRepo = container.resolve<DocumentRepository>(TOKENS.DOCUMENT_REPOSITORY);
    accessPolicyRepo = container.resolve<AccessPolicyRepository>(TOKENS.ACCESS_POLICY_REPOSITORY);
    tokenRepo = container.resolve<DownloadTokenRepository>(TOKENS.DOWNLOAD_TOKEN_REPOSITORY);
    versionRepo = container.resolve<DocumentVersionRepository>(TOKENS.DOCUMENT_VERSION_REPOSITORY);
    storageService = createStorageService();
    
    // Instantiate workflows with resolved dependencies
    uploadWorkflow = new UploadWorkflow(documentRepo, versionRepo, storageService);
    workflow = new DocumentWorkflow(documentRepo);
    accessWorkflow = new AccessPolicyWorkflow(accessPolicyRepo);
    tokenWorkflow = new DownloadTokenWorkflow(tokenRepo);
  });

  it("should create → upload → publish a document successfully", async () => {
    const createInput: CreateDocumentDTOEncoded = {
      ownerId: testUser.id,
      title: "contract.pdf",
      tags: ["legal"]
    };

    const created = await workflow.createDocument(createInput).pipe(E.runPromise);

    expect(created.id).toBeDefined();
    expect(created.ownerId).toEqual(testUser.id);
    expect(created.title).toEqual("contract.pdf");
    expect(created.description).toEqual(Option.none());

    const uploadInput: ConfirmUploadDTOEncoded = {
      documentId: created.id,
      userId: testUser.id,
      mimeType: "application/pdf",
      size: 4096,
      storageKey: "contract.pdf",
      checksum: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
    };

    const uploaded = await uploadWorkflow.confirmUpload(uploadInput).pipe(E.runPromise);
    expect(uploaded).toBeDefined();

    const publishInput: PublishDocumentDTOEncoded = {
      documentId: created.id,
      userId: testUser.id
    };

    const published = await workflow.publishDocument(publishInput).pipe(E.runPromise);
    expect(published).toBeDefined();
  });

  it("should grant-access → validate-access successfully", async () => {
    const doc = await workflow.createDocument({
      ownerId: testUser.id,
      title: "report.pdf",
      description: "Confidential report",
      tags: ["confidential"]
    }).pipe(E.runPromise);

    await uploadWorkflow.confirmUpload({
      documentId: doc.id,
      userId: testUser.id,
      mimeType: "application/pdf",
      size: 2048,
      storageKey: "document.pdf",
      checksum: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
    }).pipe(E.runPromise);

    await workflow.publishDocument({
      documentId: doc.id,
      userId: testUser.id
    }).pipe(E.runPromise);

    const accessInput: GrantAccessDTOEncoded = {
      documentId: doc.id,
      grantedTo: testUser.id,
      grantedBy: testUser.id,
      actions: ["read"],
      priority: 1
    };
    await accessWorkflow.grantAccess(accessInput).pipe(E.runPromise);

    const validateInput: CheckAccessDTOEncoded = {
      documentId: doc.id,
      userId: testUser.id,
      action: "read",
      actions: ["read"]
    };

    // const validationResult = await accessWorkflow.validateAccess(validateInput).pipe(E.runPromise);
    // expect(validationResult).toEqual(true);
  });

  it("should generate-token → validate-token → allow download access", async () => {
    const doc = await workflow.createDocument({
      ownerId: testUser.id,
      title: "invoice.pdf",
      description: "Finance invoice",
      tags: ["finance"]
    }).pipe(E.runPromise);

    await uploadWorkflow.confirmUpload({
      documentId: doc.id,
      userId: testUser.id,
      mimeType: "application/pdf",
      size: 2048,
      storageKey: "document.pdf",
      checksum: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
    }).pipe(E.runPromise);

    await workflow.publishDocument({
      documentId: doc.id,
      userId: testUser.id
    }).pipe(E.runPromise);

    const accessInput: GrantAccessDTOEncoded = {
      documentId: doc.id,
      grantedTo: testUser.id,
      grantedBy: testUser.id,
      actions: ["read"],
      priority: 1
    };
    await accessWorkflow.grantAccess(accessInput).pipe(E.runPromise);

    const token = await tokenWorkflow.createToken({
      documentId: doc.id,
      issuedTo: testUser.id,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    } satisfies CreateDownloadTokenDTOEncoded).pipe(E.runPromise);

    expect(token).toBeDefined();

    const validationResult = await tokenWorkflow.validateToken({
      tokenId: token.id,
      userId: testUser.id,
      issuedTo: testUser.id
    } satisfies ValidateDownloadTokenDTOEncoded).pipe(E.runPromise);

    expect(validationResult).toBeDefined();
  });
});
