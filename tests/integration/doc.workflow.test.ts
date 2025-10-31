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
import { container, TOKENS } from "@/app/infrastructure/di/container";

// Repository interfaces
import { DocumentRepository } from "@/app/domain/document/repository";
import { AccessPolicyRepository } from "@/app/domain/access-policy/repository";
import { DownloadTokenRepository } from "@/app/domain/download-token/repository";
import { DocumentVersionRepository } from "@/app/domain/d-version/repository";

// DTO types (schema-encoded)
import { CreateDocumentDTOEncoded } from "@/app/application/dtos/document/create-doc.dto";
import { InitiateUploadDTOEncoded } from "@/app/application/dtos/upload/initiate-upload.dto";
import { ConfirmUploadDTOEncoded } from "@/app/application/dtos/upload/confirm-upload.dto";
import { PublishDocumentDTOEncoded } from "@/app/application/dtos/document/publish-doc.dto";
import { GrantAccessDTOEncoded } from "@/app/application/dtos/access-policy/grant-access.dto";
import { CheckAccessDTOEncoded } from "@/app/application/dtos/access-policy/check-access.dto";
import { CreateDownloadTokenDTOEncoded } from "@/app/application/dtos/download-token/create-token.dto";
import { ValidateDownloadTokenDTOEncoded } from "@/app/application/dtos/download-token/validate-token.dto";
import type { UserContext } from "@/presentation/http/orpc/auth";

// Storage factory for resolving runtime implementation
import { createStorageService } from "@/app/infrastructure/storage/storage.factory";
import { StorageServiceFactory } from "@/app/infrastructure/storage/storage.factory";
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
let ownerCtx: UserContext;   // the document owner
let otherCtx: UserContext;   // another user in the same workspace (grantee)


// Test 1: Document Owner creates a document, uploads a file, publishes it,
//  and grants access to another user (grantee).
describe("Document Workflow Integration", () => {
  let db: Awaited<ReturnType<typeof setupTestDatabase>>;
  let testUser: any;
  let otherUser: any; // Store the other user so we can reuse it
  // Shared document created in test 1, reused in test 2
  let sharedDocument: any;  
  let dbInitialized = false;

  beforeEach(async () => {
    db = await setupTestDatabase();
    // Initialize the database service with the client
    databaseService.init(db.client);
    // Only cleanup database once before the first test - subsequent tests share data
    if (!dbInitialized) {
      await cleanupDatabase();
      testUser = await createTestUser(db.db);
      otherUser = await createTestUser(db.db); // Create other user once
      dbInitialized = true;
    }
    // testUser and otherUser are already created, don't recreate them
    
    // Initialize dependencies after database is set up
    documentRepo = container.resolve<DocumentRepository>(TOKENS.DOCUMENT_REPOSITORY);
    accessPolicyRepo = container.resolve<AccessPolicyRepository>(TOKENS.ACCESS_POLICY_REPOSITORY);
    tokenRepo = container.resolve<DownloadTokenRepository>(TOKENS.DOWNLOAD_TOKEN_REPOSITORY);
    versionRepo = container.resolve<DocumentVersionRepository>(TOKENS.DOCUMENT_VERSION_REPOSITORY);
    // storage service used by upload workflow (local storage for now)
    storageService = createStorageService();
    
    // Instantiate workflows with resolved dependencies
    uploadWorkflow = container.resolve<UploadWorkflow>(TOKENS.UPLOAD_WORKFLOW);
    workflow = container.resolve<DocumentWorkflow>(TOKENS.DOCUMENT_WORKFLOW);
    accessWorkflow = container.resolve<AccessPolicyWorkflow>(TOKENS.ACCESS_POLICY_WORKFLOW);
    tokenWorkflow = container.resolve<DownloadTokenWorkflow>(TOKENS.DOWNLOAD_TOKEN_WORKFLOW);

    // create a user context for the document owner
    ownerCtx = {
      userId: testUser.id,
      workspaceId: (testUser.workspaceId ?? "00000000-0000-0000-0000-000000000000") as any,
      roles: ["user"],
      correlationId: "test-corr-owner"
    } as UserContext

    // create a second user context using the stored otherUser
    otherCtx = {
      userId: otherUser.id,
      workspaceId: (otherUser.workspaceId ?? ownerCtx.workspaceId) as any,
      roles: ["user"],
      correlationId: "test-corr-other"
    } as UserContext
  });

  it("should create → upload → publish a document successfully", async () => {
/*
1. createDocument:   create a document as the owner
createDocument — Creates the document metadata entity
Creates a DocumentSchemaEntity with metadata (title, description, tags, ownerId, etc.)
No file yet — just a record
Stores metadata in the database
*/
    const createInput: CreateDocumentDTOEncoded = {
      ownerId: testUser.id,
      title: "contract.pdf",
      tags: ["legal"]
    };

       // Act: call the document creation workflow
    const createdEff = await workflow.createDocument(createInput, ownerCtx);
    // Assert: verify the document was created successfully
    const created = await E.runPromise(createdEff);

  
    expect(created.id).toBeDefined();
    expect(created.ownerId).toEqual(testUser.id);
    expect(created.title).toEqual("contract.pdf");
    expect(created.description).toEqual(Option.none());

    // Step 2: Initiate upload - get presigned URL (or in test, prepare for upload)
    const initiateInput: InitiateUploadDTOEncoded = {
      documentId: created.id,
      userId: testUser.id,
      filename: "contract.pdf",
      mimeType: "application/pdf",
      size: 4096
    };

    const initiateEff = await uploadWorkflow.initiateUpload(initiateInput, ownerCtx);
    const presignedUrl = await E.runPromise(initiateEff);
    expect(presignedUrl.url).toBeDefined();

    // Step 3: Actually upload the file to storage
    // In production, client uploads file using presigned URL
    // In test, we directly upload to storage using storage service
    const fileContent = Buffer.from("This is a test PDF file content");
    const storageService = StorageServiceFactory.getInstance();
    const uploadResult = await storageService.uploadFile(
      {
        buffer: fileContent,
        originalname: "contract.pdf",
        mimetype: "application/pdf",
        size: fileContent.length
      },
      `${created.id}/contract.pdf`,
      {
        contentType: "application/pdf"
      }
    );

    expect(uploadResult.key).toBeDefined();
    expect(uploadResult.checksum).toBeDefined();


    // Step 4: Confirm the upload - create document version record
    const confirmInput: ConfirmUploadDTOEncoded = {
      documentId: created.id,
      userId: testUser.id,
      mimeType: "application/pdf",
      size: fileContent.length,
      storageKey: uploadResult.key,
      checksum: uploadResult.checksum
    };

    const uploadedEff = await uploadWorkflow.confirmUpload(confirmInput, ownerCtx);
    const uploaded = await E.runPromise(uploadedEff);
    expect(uploaded).toBeDefined();
    expect(uploaded.documentId).toEqual(created.id);


    // Step 5: Publish the document - make it publicly accessible just for the owner 
    const publishInput: PublishDocumentDTOEncoded = {
      documentId: created.id,
      userId: testUser.id
    };

    const publishedEff = await workflow.publishDocument(publishInput, ownerCtx);
    const published = await E.runPromise(publishedEff);
    expect(published).toBeDefined();

    // Store the published document for reuse in test 2
    sharedDocument = published;
  });


  // Test 2: Document Owner grants access to another user (grantee).
  // Reuses the document created in test 1
  
  it("should grant-access → validate-access successfully", async () => {
    // Use the document created and published in test 1
    expect(sharedDocument).toBeDefined();
    expect(sharedDocument.id).toBeDefined();

    // Grant access to the other user
    const accessInput: GrantAccessDTOEncoded = {
      documentId: sharedDocument.id,
      /*
      why is the userId as any? 
      because the userId is a string, and the otherCtx.userId is a string,
      so we need to cast it to any to avoid type errors.
      */
      grantedTo: otherCtx.userId,
      grantedBy: testUser.id,
      actions: ["read", "update"],
      priority: 1
    };
    const grantEff = await accessWorkflow.grantAccess(accessInput, ownerCtx);
    await E.runPromise(grantEff);

    // Validate that the other user now has access
    const validateInput: CheckAccessDTOEncoded = {
      documentId: sharedDocument.id,
      userId: otherCtx.userId,  
      action: "read",
      actions: ["read"]
    };

    // Act: check if the other user has access (must use otherCtx, not ownerCtx)
    // checkAccess checks permissions for dto.userId, so we use otherCtx
    const checkEff = await accessWorkflow.checkAccess(validateInput, otherCtx);
    const allowed = await E.runPromise(checkEff);
    expect(allowed).toBeTruthy();
  });

  // Test 3: Token generation and validation
  // Reuses the document from test 1 (access already granted in test 2)
  it("should generate-token → validate-token → allow download access", async () => {
    // Use the document from test 1 (access already granted in test 2)
    expect(sharedDocument).toBeDefined();
    expect(sharedDocument.id).toBeDefined();

    // Test 2 already granted access with ["read", "update"], which includes "read" needed for tokens
    // So we can directly create a token
    const tokenEff = await tokenWorkflow.createToken({
      documentId: sharedDocument.id,
      issuedTo: otherCtx.userId,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    } as CreateDownloadTokenDTOEncoded, otherCtx);
    const token = await E.runPromise(tokenEff);

    expect(token).toBeDefined();

    const valEff = await tokenWorkflow.validateToken({
      tokenId: token.id,
      userId: otherCtx.userId,
      issuedTo: otherCtx.userId
    } as ValidateDownloadTokenDTOEncoded, otherCtx);
    const validationResult = await E.runPromise(valEff);

    expect(validationResult).toBeDefined();
  });
});
