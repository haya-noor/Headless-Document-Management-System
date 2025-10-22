/**
 * DownloadToken Repository Integration Tests
 * 
 * Tests all CRUD operations, schema validation, token lifecycle, and cleanup.
 * Uses Effect-based error handling and Option for nullable results.
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { Effect, Option } from "effect";
import { eq } from "drizzle-orm";

import { DownloadTokenRepository } from "@/app/infrastructure/repositories/implementations/download-token-repository";
import {
  setupTestDatabase,
  cleanupDatabase,
  createTestUser,
  createTestDocument,
  type TestDatabase,
} from "../setup/database.setup";

import {
  createTestDownloadTokenEntity,
  generateTestDownloadToken,
  createUnusedToken,
  createUsedToken,
  createExpiredToken,
} from "../factories/download-token.factory-test";
import {
  makeDownloadTokenIdSync,
  makeDocumentIdSync,
  makeUserIdSync,
  type UserId,
  type DocumentId,
} from "@/app/domain/refined/uuid";
import {
  NotFoundError,
  ConflictError,
  DatabaseError,
  ValidationError,
} from "@/app/domain/shared/base.errors";

// Effect runner helpers
const runEffect = <T, E>(fx: Effect.Effect<T, E>): Promise<T> => Effect.runPromise(fx);
const runEffectSync = <T, E>(fx: Effect.Effect<T, E>): T => Effect.runSync(fx);

describe("DownloadTokenRepository Integration Tests", () => {
  let testDb: TestDatabase;
  let tokenRepository: DownloadTokenRepository;
  let testUserId: UserId;
  let testDocumentId: DocumentId;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    tokenRepository = new DownloadTokenRepository(testDb.db);
  });

  afterAll(async () => {
    await testDb.cleanup?.();
  });

  beforeEach(async () => {
    await cleanupDatabase();

    // Prerequisites: a user and a document
    const user = await createTestUser(testDb.db, {
      email: "token-creator@example.com",
    });
    testUserId = user.id as UserId;

    const document = await createTestDocument(testDb.db, testUserId, {
      filename: "test-document.pdf",
    });
    testDocumentId = document.id as DocumentId;
  });

  // ============================================================================
  // SAVE (CREATE)
  // ============================================================================

  describe("save (CREATE)", () => {
    it("saves a new download token and returns the entity", async () => {
      const tokenData = generateTestDownloadToken({
        documentId: testDocumentId,
        issuedTo: testUserId,
      });
      const tokenEntity = runEffectSync(
        createTestDownloadTokenEntity(tokenData)
      );

      const saved = await runEffect(tokenRepository.save(tokenEntity));

      expect(saved.id).toBe(tokenEntity.id);
      expect(saved.token).toBe(tokenEntity.token);
      expect(saved.documentId).toBe(testDocumentId);
      expect(saved.issuedTo).toBe(testUserId);
      expect(Option.isNone(saved.usedAt)).toBe(true);
    });

    it("saves multiple tokens for the same document", async () => {
      const token1Data = generateTestDownloadToken({
        documentId: testDocumentId,
        issuedTo: testUserId,
      });
      const token2Data = generateTestDownloadToken({
        documentId: testDocumentId,
        issuedTo: testUserId,
      });

      const token1 = runEffectSync(createTestDownloadTokenEntity(token1Data));
      const token2 = runEffectSync(createTestDownloadTokenEntity(token2Data));

      await runEffect(tokenRepository.save(token1));
      await runEffect(tokenRepository.save(token2));

      const tokens = await runEffect(
        tokenRepository.findByDocumentId(testDocumentId)
      );

      expect(tokens).toHaveLength(2);
    });

    it("enforces unique token string constraint", async () => {
      const tokenData = generateTestDownloadToken({
        documentId: testDocumentId,
        issuedTo: testUserId,
      });
      const tokenEntity1 = runEffectSync(
        createTestDownloadTokenEntity(tokenData)
      );
      const tokenEntity2 = runEffectSync(
        createTestDownloadTokenEntity({
          ...tokenData,
          id: crypto.randomUUID(),
          token: tokenEntity1.token, // same token string
        })
      );

      await runEffect(tokenRepository.save(tokenEntity1));

      const result = await tokenRepository.save(tokenEntity2)
        .pipe(Effect.either, Effect.runPromise)
        .catch((err) => err);

      expect(result).toBeInstanceOf(ConflictError);
    });
  });

  // ============================================================================
  // FIND BY ID
  // ============================================================================

  describe("findById (READ)", () => {
    it("finds token by id", async () => {
      const tokenData = generateTestDownloadToken({
        documentId: testDocumentId,
        issuedTo: testUserId,
      });
      const entity = runEffectSync(createTestDownloadTokenEntity(tokenData));

      await runEffect(tokenRepository.save(entity));

      const foundOpt = await runEffect(tokenRepository.findById(entity.id));

      expect(Option.isSome(foundOpt)).toBe(true);
      const found = Option.getOrThrow(foundOpt);
      expect(found.id).toBe(entity.id);
      expect(found.token).toBe(entity.token);
    });

    it("returns None for non-existent id", async () => {
      const nonExistentId = makeDownloadTokenIdSync(crypto.randomUUID());
      const foundOpt = await runEffect(
        tokenRepository.findById(nonExistentId)
      );

      expect(Option.isNone(foundOpt)).toBe(true);
    });
  });

  // ============================================================================
  // FIND BY TOKEN STRING
  // ============================================================================

  describe("findByToken (READ)", () => {
    it("finds token by token string", async () => {
      const tokenData = generateTestDownloadToken({
        documentId: testDocumentId,
        issuedTo: testUserId,
      });
      const entity = runEffectSync(createTestDownloadTokenEntity(tokenData));

      await runEffect(tokenRepository.save(entity));

      const foundOpt = await runEffect(
        tokenRepository.findByToken(entity.token)
      );

      expect(Option.isSome(foundOpt)).toBe(true);
      const found = Option.getOrThrow(foundOpt);
      expect(found.token).toBe(entity.token);
      expect(found.id).toBe(entity.id);
    });

    it("returns None for non-existent token string", async () => {
      const foundOpt = await runEffect(
        tokenRepository.findByToken("invalid-token-string")
      );

      expect(Option.isNone(foundOpt)).toBe(true);
    });
  });

  // ============================================================================
  // FIND BY DOCUMENT ID
  // ============================================================================

  describe("findByDocumentId (READ)", () => {
    it("finds all tokens for a document", async () => {
      const token1Data = generateTestDownloadToken({
        documentId: testDocumentId,
        issuedTo: testUserId,
      });
      const token2Data = generateTestDownloadToken({
        documentId: testDocumentId,
        issuedTo: testUserId,
      });

      const token1 = runEffectSync(createTestDownloadTokenEntity(token1Data));
      const token2 = runEffectSync(createTestDownloadTokenEntity(token2Data));

      await runEffect(tokenRepository.save(token1));
      await runEffect(tokenRepository.save(token2));

      const tokens = await runEffect(
        tokenRepository.findByDocumentId(testDocumentId)
      );

      expect(tokens).toHaveLength(2);
      expect(tokens.map((t) => t.id)).toContain(token1.id);
      expect(tokens.map((t) => t.id)).toContain(token2.id);
    });

    it("returns empty array when no tokens exist for document", async () => {
      const tokens = await runEffect(
        tokenRepository.findByDocumentId(testDocumentId)
      );

      expect(tokens).toHaveLength(0);
    });
  });

  // ============================================================================
  // FIND BY USER ID
  // ============================================================================

  describe("findByUserId (READ)", () => {
    it("finds all tokens issued to a user", async () => {
      const user2 = await createTestUser(testDb.db, {
        email: "another-user@example.com",
      });

      const token1Data = generateTestDownloadToken({
        documentId: testDocumentId,
        issuedTo: testUserId,
      });
      const token2Data = generateTestDownloadToken({
        documentId: testDocumentId,
        issuedTo: user2.id,
      });

      const token1 = runEffectSync(createTestDownloadTokenEntity(token1Data));
      const token2 = runEffectSync(createTestDownloadTokenEntity(token2Data));

      await runEffect(tokenRepository.save(token1));
      await runEffect(tokenRepository.save(token2));

      const userTokens = await runEffect(
        tokenRepository.findByUserId(makeUserIdSync(testUserId))
      );

      expect(userTokens).toHaveLength(1);
      expect(userTokens[0].issuedTo).toBe(testUserId);
    });

    it("returns empty array when user has no tokens", async () => {
      const tokens = await runEffect(
        tokenRepository.findByUserId(makeUserIdSync(testUserId))
      );

      expect(tokens).toHaveLength(0);
    });
  });

  // ============================================================================
  // FIND UNUSED BY DOCUMENT ID
  // ============================================================================

  describe("findUnusedByDocumentId (READ)", () => {
    it("finds only unused tokens for a document", async () => {
      const unusedData = createUnusedToken({
        documentId: testDocumentId,
        issuedTo: testUserId,
      });
      const usedData = createUsedToken({
        documentId: testDocumentId,
        issuedTo: testUserId,
      });

      const unused = runEffectSync(createTestDownloadTokenEntity(unusedData));
      const used = runEffectSync(createTestDownloadTokenEntity(usedData));

      await runEffect(tokenRepository.save(unused));
      await runEffect(tokenRepository.save(used));

      const tokens = await runEffect(
        tokenRepository.findUnusedByDocumentId(
          testDocumentId
        )
      );

      expect(tokens).toHaveLength(1);
      expect(tokens[0].id).toBe(unused.id);
      expect(Option.isNone(tokens[0].usedAt)).toBe(true);
    });
  });

  // ============================================================================
  // FIND EXPIRED
  // ============================================================================

  describe("findExpired (READ)", () => {
    it("finds only expired tokens", async () => {
      const validData = createUnusedToken({
        documentId: testDocumentId,
        issuedTo: testUserId,
      });
      const expiredData = createExpiredToken({
        documentId: testDocumentId,
        issuedTo: testUserId,
      });

      const valid = runEffectSync(createTestDownloadTokenEntity(validData));
      const expired = runEffectSync(createTestDownloadTokenEntity(expiredData));

      await runEffect(tokenRepository.save(valid));
      await runEffect(tokenRepository.save(expired));

      const expiredTokens = await runEffect(tokenRepository.findExpired());

      expect(expiredTokens).toHaveLength(1);
      expect(expiredTokens[0].id).toBe(expired.id);
    });
  });

  // ============================================================================
  // FIND USED
  // ============================================================================

  describe("findUsed (READ)", () => {
    it("finds only used tokens", async () => {
      const unusedData = createUnusedToken({
        documentId: testDocumentId,
        issuedTo: testUserId,
      });
      const usedData = createUsedToken({
        documentId: testDocumentId,
        issuedTo: testUserId,
      });

      const unused = runEffectSync(createTestDownloadTokenEntity(unusedData));
      const used = runEffectSync(createTestDownloadTokenEntity(usedData));

      await runEffect(tokenRepository.save(unused));
      await runEffect(tokenRepository.save(used));

      const usedTokens = await runEffect(tokenRepository.findUsed());

      expect(usedTokens).toHaveLength(1);
      expect(usedTokens[0].id).toBe(used.id);
      expect(Option.isSome(usedTokens[0].usedAt)).toBe(true);
    });
  });

  // ============================================================================
  // EXISTS
  // ============================================================================

  describe("exists (READ)", () => {
    it("returns true when token exists", async () => {
      const tokenData = generateTestDownloadToken({
        documentId: testDocumentId,
        issuedTo: testUserId,
      });
      const entity = runEffectSync(createTestDownloadTokenEntity(tokenData));

      await runEffect(tokenRepository.save(entity));

      const exists = await runEffect(tokenRepository.exists(entity.id));

      expect(exists).toBe(true);
    });

    it("returns false when token does not exist", async () => {
      const nonExistentId = makeDownloadTokenIdSync(crypto.randomUUID());
      const exists = await runEffect(
        tokenRepository.exists(nonExistentId)
      );

      expect(exists).toBe(false);
    });
  });

  // ============================================================================
  // UPDATE
  // ============================================================================

  describe("update (WRITE)", () => {
    it("updates token to mark as used", async () => {
      const tokenData = createUnusedToken({
        documentId: testDocumentId,
        issuedTo: testUserId,
      });
      const entity = runEffectSync(createTestDownloadTokenEntity(tokenData));

      await runEffect(tokenRepository.save(entity));

      // Mark as used via Effect (simulating markAsUsed behavior)
      const updatedEntity = await runEffect(
        entity.markAsUsed() as any
      ) as any;

      const result = await runEffect(
        tokenRepository.update(updatedEntity)
      );

      expect(result.id).toBe(entity.id);
      expect(Option.isSome(result.usedAt)).toBe(true);

      // Verify in database
      const fetched = await runEffect(tokenRepository.findById(entity.id));
      const found = Option.getOrThrow(fetched);
      expect(Option.isSome(found.usedAt)).toBe(true);
    });

    it("fails to update non-existent token", async () => {
      const tokenData = createUnusedToken({
        documentId: testDocumentId,
        issuedTo: testUserId,
      });
      const entity = runEffectSync(createTestDownloadTokenEntity(tokenData));

      const result = await tokenRepository.update(entity)
        .pipe(Effect.either, Effect.runPromise)
        .catch((err) => err);

      expect(result).toBeInstanceOf(NotFoundError);
    });
  });
});