/**
 * DocumentVersion Repository Integration Tests
 * 
 * Tests all CRUD operations, schema validation, constraints, and analytics.
 * Uses Effect-based error handling and Option for nullable results.
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { Effect, Option } from "effect";
import { eq, sql } from "drizzle-orm";

import { DocumentVersionDrizzleRepository } from "@/app/infrastructure/repositories/implementations/d-version.repository";
import {
  setupTestDatabase,
  cleanupDatabase,
  createTestUser,
  createTestDocument,
  type TestDatabase,
} from "../setup/database.setup";

import {
  createTestDocumentVersionEntity,
  generateTestDocumentVersion,
} from "../factories/d-version.factory-test";
import {
  makeDocumentIdSync,
  makeDocumentVersionIdSync,
  makeUserIdSync,
  type UserId,
  type DocumentId,
} from "@/app/domain/shared/uuid";
import { NotFoundError, ConflictError, DatabaseError, ValidationError } from "@/app/domain/shared/errors";

/*
runEffect: runs an Effect and returns a Promise for async/await testing
runEffectSync: runs an Effect and returns a value for sync testing
*/
const runEffect = <T, E>(fx: Effect.Effect<T, E>): Promise<T> => Effect.runPromise(fx);
const runEffectSync = <T, E>(fx: Effect.Effect<T, E>): T => Effect.runSync(fx);

describe("DocumentVersionRepository Integration Tests", () => {
  let testDb: TestDatabase;
  let versionRepository: DocumentVersionDrizzleRepository;
  let testUserId: UserId;
  let testDocumentId: DocumentId;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    versionRepository = new DocumentVersionDrizzleRepository(testDb.db);
  });

  afterAll(async () => {
    await testDb.cleanup?.();
  });

  beforeEach(async () => {
    await cleanupDatabase();

    // Prerequisites: a user and a document
    const user = await createTestUser(testDb.db, {
      email: "version-owner@example.com",
    });
    testUserId = user.id as UserId;

    const bootstrapVersionId = crypto.randomUUID();
    const document = await createTestDocument(testDb.db, testUserId, {
      title: "Document for Versions",
      currentVersionId: bootstrapVersionId,
    });
    testDocumentId = document.id as DocumentId;
  });

  // ============================================================================
  // SAVE (CREATE)
  // ============================================================================

  describe("save (CREATE)", () => {
    it("saves a new document version and returns the entity", async () => {
      const versionData = generateTestDocumentVersion({
        documentId: testDocumentId,
        version: 1,
      });
      const versionEntity = runEffectSync(
        createTestDocumentVersionEntity(versionData)
      );

      const saved = await runEffect(versionRepository.save(versionEntity));

      expect(saved.id).toBe(versionEntity.id);
      expect(saved.documentId).toBe(testDocumentId);
      expect(saved.version).toBe(1);
      expect(Option.getOrNull(saved.checksum)).toBe(versionData.checksum);
    });

    it("saves multiple versions for the same document", async () => {
      const v1Data = generateTestDocumentVersion({
        documentId: testDocumentId,
        version: 1,
      });
      const v2Data = generateTestDocumentVersion({
        documentId: testDocumentId,
        version: 2,
      });

      const v1 = runEffectSync(createTestDocumentVersionEntity(v1Data));
      const v2 = runEffectSync(createTestDocumentVersionEntity(v2Data));

      await runEffect(versionRepository.save(v1));
      await runEffect(versionRepository.save(v2));

      const versions = await runEffect(
        versionRepository.findByDocumentId(testDocumentId)
      );

      expect(versions).toHaveLength(2);
      expect(versions.map((v) => v.version).sort()).toEqual([1, 2]);
    });

    it("enforces unique (documentId, version) constraint", async () => {
      const v1Data = generateTestDocumentVersion({
        documentId: testDocumentId,
        version: 1,
      });
      const v1dupData = generateTestDocumentVersion({
        documentId: testDocumentId,
        version: 1,
      });

      const v1 = runEffectSync(createTestDocumentVersionEntity(v1Data));
      const v1dup = runEffectSync(createTestDocumentVersionEntity(v1dupData));

      await runEffect(versionRepository.save(v1));

      const result = await versionRepository.save(v1dup)
        .pipe(Effect.either, Effect.runPromise)
        .catch((err) => err);

      expect(result).toBeInstanceOf(ConflictError);
    });
  });

  // ============================================================================
  // FIND BY ID
  // ============================================================================

  describe("findById (READ)", () => {
    it("finds version by id", async () => {
      const versionData = generateTestDocumentVersion({
        documentId: testDocumentId,
        version: 1,
      });
      const entity = runEffectSync(createTestDocumentVersionEntity(versionData));

      await runEffect(versionRepository.save(entity));

      const foundOpt = await runEffect(versionRepository.findById(entity.id));

      expect(Option.isSome(foundOpt)).toBe(true);
      const found = Option.getOrThrow(foundOpt);
      expect(found.id).toBe(entity.id);
      expect(found.version).toBe(1);
    });

    it("returns None for non-existent id", async () => {
      const nonExistentId = makeDocumentVersionIdSync(crypto.randomUUID());
      const foundOpt = await runEffect(
        versionRepository.findById(nonExistentId)
      );

      expect(Option.isNone(foundOpt)).toBe(true);
    });
  });

  // ============================================================================
  // FIND BY DOCUMENT ID AND VERSION
  // ============================================================================

  describe("findByDocumentIdAndVersion (READ)", () => {
    it("finds version by document id and version number", async () => {
      const versionData = generateTestDocumentVersion({
        documentId: testDocumentId,
        version: 3,
      });
      const entity = runEffectSync(createTestDocumentVersionEntity(versionData));

      await runEffect(versionRepository.save(entity));

      const foundOpt = await runEffect(
        versionRepository.findByDocumentIdAndVersion(
          testDocumentId,
          3
        )
      );

      expect(Option.isSome(foundOpt)).toBe(true);
      const found = Option.getOrThrow(foundOpt);
      expect(found.documentId).toBe(testDocumentId);
      expect(found.version).toBe(3);
    });

    it("returns None for non-existent version number", async () => {
      const foundOpt = await runEffect(
        versionRepository.findByDocumentIdAndVersion(
          testDocumentId,
          99
        )
      );

      expect(Option.isNone(foundOpt)).toBe(true);
    });
  });

  // ============================================================================
  // FIND ALL BY DOCUMENT ID
  // ============================================================================

  describe("findByDocumentId (READ)", () => {
    it("finds all versions for a document in descending order", async () => {
      const v1Data = generateTestDocumentVersion({
        documentId: testDocumentId,
        version: 1,
      });
      const v2Data = generateTestDocumentVersion({
        documentId: testDocumentId,
        version: 2,
      });
      const v3Data = generateTestDocumentVersion({
        documentId: testDocumentId,
        version: 3,
      });

      const v1 = runEffectSync(createTestDocumentVersionEntity(v1Data));
      const v2 = runEffectSync(createTestDocumentVersionEntity(v2Data));
      const v3 = runEffectSync(createTestDocumentVersionEntity(v3Data));

      await runEffect(versionRepository.save(v1));
      await runEffect(versionRepository.save(v2));
      await runEffect(versionRepository.save(v3));

      const versions = await runEffect(
        versionRepository.findByDocumentId(testDocumentId)
      );

      expect(versions).toHaveLength(3);
      // Should be in descending order (3, 2, 1)
      expect(versions[0].version).toBe(3);
      expect(versions[1].version).toBe(2);
      expect(versions[2].version).toBe(1);
    });

    it("returns empty array when no versions exist", async () => {
      const newVersionId = crypto.randomUUID();
      const newDoc = await createTestDocument(testDb.db, testUserId, {
        title: "No Versions Doc",
        currentVersionId: newVersionId,
      });

      const versions = await runEffect(
        versionRepository.findByDocumentId(makeDocumentIdSync(newDoc.id))
      );

      expect(versions).toHaveLength(0);
    });
  });

  // ============================================================================
  // FIND LATEST BY DOCUMENT ID
  // ============================================================================

  describe("findLatestByDocumentId (READ)", () => {
    it("returns the latest version by document id", async () => {
      const v1Data = generateTestDocumentVersion({
        documentId: testDocumentId,
        version: 1,
      });
      const v2Data = generateTestDocumentVersion({
        documentId: testDocumentId,
        version: 2,
      });
      const v3Data = generateTestDocumentVersion({
        documentId: testDocumentId,
        version: 3,
      });

      const v1 = runEffectSync(createTestDocumentVersionEntity(v1Data));
      const v2 = runEffectSync(createTestDocumentVersionEntity(v2Data));
      const v3 = runEffectSync(createTestDocumentVersionEntity(v3Data));

      await runEffect(versionRepository.save(v1));
      await runEffect(versionRepository.save(v2));
      await runEffect(versionRepository.save(v3));

      const latestOpt = await runEffect(
        versionRepository.findLatestByDocumentId(
          testDocumentId
        )
      );

      expect(Option.isSome(latestOpt)).toBe(true);
      const latest = Option.getOrThrow(latestOpt);
      expect(latest.version).toBe(3);
    });

    it("returns None for document with no versions", async () => {
      const newVersionId = crypto.randomUUID();
      const newDoc = await createTestDocument(testDb.db, testUserId, {
        title: "No Versions Doc 2",
        currentVersionId: newVersionId,
      });

      const latestOpt = await runEffect(
        versionRepository.findLatestByDocumentId(makeDocumentIdSync(newDoc.id))
      );

      expect(Option.isNone(latestOpt)).toBe(true);
    });
  });

  // ============================================================================
  // GET NEXT VERSION NUMBER
  // ============================================================================

  describe("getNextVersionNumber (READ)", () => {
    it("returns 1 for document with no versions", async () => {
      const next = await runEffect(
        versionRepository.getNextVersionNumber(
          testDocumentId
        )
      );

      expect(next).toBe(1);
    });

    it("returns next number after existing versions", async () => {
      const v1Data = generateTestDocumentVersion({
        documentId: testDocumentId,
        version: 1,
      });
      const v2Data = generateTestDocumentVersion({
        documentId: testDocumentId,
        version: 2,
      });

      const v1 = runEffectSync(createTestDocumentVersionEntity(v1Data));
      const v2 = runEffectSync(createTestDocumentVersionEntity(v2Data));

      await runEffect(versionRepository.save(v1));
      await runEffect(versionRepository.save(v2));

      const next = await runEffect(
        versionRepository.getNextVersionNumber(
          testDocumentId
        )
      );

      expect(next).toBe(3);
    });
  });

  // ============================================================================
  // EXISTS
  // ============================================================================

  describe("exists (READ)", () => {
    it("returns true when version exists", async () => {
      const versionData = generateTestDocumentVersion({
        documentId: testDocumentId,
        version: 1,
      });
      const entity = runEffectSync(createTestDocumentVersionEntity(versionData));

      await runEffect(versionRepository.save(entity));

      const exists = await runEffect(versionRepository.exists(entity.id));

      expect(exists).toBe(true);
    });

    it("returns false when version does not exist", async () => {
      const nonExistentId = makeDocumentVersionIdSync(crypto.randomUUID());
      const exists = await runEffect(
        versionRepository.exists(nonExistentId)
      );

      expect(exists).toBe(false);
    });
  });

  // ============================================================================
  // COUNT
  // ============================================================================

  describe("count (READ)", () => {
    it("counts all versions for a document", async () => {
      const v1Data = generateTestDocumentVersion({
        documentId: testDocumentId,
        version: 1,
      });
      const v2Data = generateTestDocumentVersion({
        documentId: testDocumentId,
        version: 2,
      });

      const v1 = runEffectSync(createTestDocumentVersionEntity(v1Data));
      const v2 = runEffectSync(createTestDocumentVersionEntity(v2Data));

      await runEffect(versionRepository.save(v1));
      await runEffect(versionRepository.save(v2));

      const cnt = await runEffect(
        versionRepository.count(testDocumentId)
      );

      expect(cnt).toBe(2);
    });

    it("returns 0 for document with no versions", async () => {
      const cnt = await runEffect(
        versionRepository.count(testDocumentId)
      );

      expect(cnt).toBe(0);
    });
  });
});