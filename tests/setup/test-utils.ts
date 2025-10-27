// File: tests/setup/test-utils.ts
import { faker } from "@faker-js/faker";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { users, documents } from "@/app/infrastructure/database/models/index";
import { createTestUser, createTestDocument } from "./database.setup";
import { DocumentWorkflow } from "@/app/application/workflows/doc.workflow";
import { container } from "tsyringe";
import { TOKENS } from "@/app/infrastructure/di/container";
import { DocumentRepository } from "@/app/domain/document/repository";
import { PublishDocumentDTOEncoded } from "@/app/application/dtos/document/publish-doc.dto";
import { Effect as E } from "effect";

// Create a test user and return the DB user row
export async function makeTestUser(db: ReturnType<typeof drizzle>) {
  return createTestUser(db);
}

// Create a test document owned by given user
export async function makeTestDocument(db: ReturnType<typeof drizzle>, userId: string) {
  return createTestDocument(db, userId);
}

// Create and publish a document
export async function makeAndPublishDocument(db: ReturnType<typeof drizzle>, userId: string) {
  const documentRepo = container.resolve<DocumentRepository>(TOKENS.DOCUMENT_REPOSITORY);
  const workflow = new DocumentWorkflow(documentRepo);

  const created = await workflow.createDocument({
    ownerId: userId,
    title: faker.system.fileName(),
    description: faker.lorem.sentence(),
    tags: [faker.lorem.word()]
  }).pipe(E.runPromise);

  const published = await workflow.publishDocument({
    documentId: created.id,
    userId: userId
  } satisfies PublishDocumentDTOEncoded).pipe(E.runPromise);

  return published;
}
