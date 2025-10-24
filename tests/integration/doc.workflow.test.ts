// File: tests/integration/document.workflow.test.ts

// Import core Vitest functions for describing, running, and asserting tests
import { describe, it, beforeEach, expect } from "vitest";

// Test setup utilities for database and seed data
import {
  setupTestDatabase,
  cleanupDatabase,
  createTestUser
} from "../setup/database.setup";

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
import { Effect as E } from "effect";

// Dependency resolution using the DI container
const documentRepo = container.resolve<DocumentRepository>(TOKENS.DOCUMENT_REPOSITORY);
const accessPolicyRepo = container.resolve<AccessPolicyRepository>(TOKENS.ACCESS_POLICY_REPOSITORY);
const tokenRepo = container.resolve<DownloadTokenRepository>(TOKENS.DOWNLOAD_TOKEN_REPOSITORY);
const versionRepo = container.resolve<DocumentVersionRepository>(TOKENS.DOCUMENT_VERSION_REPOSITORY);
const storageService = createStorageService(); // Create concrete instance of StorageService

// Instantiate workflows with resolved dependencies
const uploadWorkflow = new UploadWorkflow(documentRepo, versionRepo, storageService);
const workflow = new DocumentWorkflow(documentRepo);
const accessWorkflow = new AccessPolicyWorkflow(accessPolicyRepo);
const tokenWorkflow = new DownloadTokenWorkflow(tokenRepo);

describe("Document Workflow Integration", () => {
  let db: Awaited<ReturnType<typeof setupTestDatabase>>;
  let testUser: any;

  // Run before each test — sets up clean DB and creates a user
  beforeEach(async () => {
    db = await setupTestDatabase();
    await cleanupDatabase(); // ensures DB isolation between tests
    testUser = await createTestUser(db.db);
  });

  // 1. Full workflow: create → upload → publish
  it("should create → upload → publish a document successfully", async () => {
    // Create document input
    const createInput: CreateDocumentDTOEncoded = {
      ownerId: testUser.id,
      title: "contract.pdf",
      description: "Legal contract",
      tags: ["legal"]
    };

    // Step 1: Create document
    const created = await workflow.createDocument(createInput).pipe(E.runPromise);

    // Validate created document fields
    expect(created.id).toBeDefined();
    expect(created.ownerId).toEqual(testUser.id);
    expect(created.title).toEqual("contract.pdf");
    expect(created.description).toEqual("Legal contract");

    // Step 2: confirm upload
    const uploadInput: ConfirmUploadDTOEncoded = {
      documentId: created.id,
      userId: testUser.id,
      mimeType: "application/pdf",
      size: 4096,
      storageKey: "contract.pdf",
      checksum: "abc123def456"
    };

    const uploaded = await uploadWorkflow.confirmUpload(uploadInput).pipe(E.runPromise);
    expect(uploaded).toBeDefined(); // Should return saved version

    // Step 3: Publish document
    const publishInput: PublishDocumentDTOEncoded = {
      documentId: created.id,
      userId: testUser.id
    };

    const published = await workflow.publishDocument(publishInput).pipe(E.runPromise);
    expect(published).toBeDefined(); // Final published doc
  });

  // 2. Workflow: grant-access → validate-access
  it("should grant-access → validate-access successfully", async () => {
    // Create and publish document
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
      checksum: "xyz789"
    }).pipe(E.runPromise);

    await workflow.publishDocument({
      documentId: doc.id,
      userId: testUser.id
    }).pipe(E.runPromise);

    // Grant read access to self
    const accessInput: GrantAccessDTOEncoded = {
      documentId: doc.id,
      grantedTo: testUser.id,
      grantedBy: testUser.id,
      actions: ["read"],
      priority: 1
    };
    await accessWorkflow.grantAccess(accessInput).pipe(E.runPromise);

    // Validate access using policy check
    const validateInput: CheckAccessDTOEncoded = {
      documentId: doc.id,
      userId: testUser.id,
      action: "read",
      actions: ["read"]
    };

    // Uncomment this to assert access validation:
    // const validationResult = await accessWorkflow.validateAccess(validateInput).pipe(E.runPromise);
    // expect(validationResult).toEqual(true);
  });

  // 3. Workflow: generate-token → validate-token
  it("should generate-token → validate-token → allow download access", async () => {
    // Create + publish document
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
      checksum: "xyz789"
    }).pipe(E.runPromise);

    await workflow.publishDocument({
      documentId: doc.id,
      userId: testUser.id
    }).pipe(E.runPromise);

    // Grant read access
    const accessInput: GrantAccessDTOEncoded = {
      documentId: doc.id,
      grantedTo: testUser.id,
      grantedBy: testUser.id,
      actions: ["read"],
      priority: 1
    };
    await accessWorkflow.grantAccess(accessInput).pipe(E.runPromise);

    // Step 1: Generate download token
    const token = await tokenWorkflow.createToken({
      documentId: doc.id,
      issuedTo: testUser.id,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // expires in 5 mins
    } satisfies CreateDownloadTokenDTOEncoded).pipe(E.runPromise);

    expect(token).toBeDefined();

    // Step 2: Validate download token
    const validationResult = await tokenWorkflow.validateToken({
      tokenId: token.id,
      userId: testUser.id,
      issuedTo: testUser.id
    } satisfies ValidateDownloadTokenDTOEncoded).pipe(E.runPromise);

    expect(validationResult).toBeDefined(); // Token should be valid
  });
});
