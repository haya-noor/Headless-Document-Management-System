/**
 * Seed Data Helpers
 * -----------------
 * Seeds database with fake domain entities for integration tests.
 */

import { faker } from "../setup"
import { Effect, Option } from "effect"
import { users, documents } from "@/app/infrastructure/database/models"
import { getDb } from "./database.setup"
import { v4 as uuidv4 } from "uuid"

export const seedUsers = async (count = 3) => {
  const db = getDb()
  const data = Array.from({ length: count }).map(() => ({
    id: uuidv4(),
    email: faker.internet.email().toLowerCase(),
    password: faker.internet.password(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role: faker.helpers.arrayElement(["admin", "user"]),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
  await db.insert(users).values(data)
  return data
}

export const seedDocuments = async (ownerId: string, count = 3) => {
  const db = getDb()
  const data = Array.from({ length: count }).map(() => ({
    id: uuidv4(),
    ownerId,
    filename: faker.system.fileName(),
    originalName: faker.system.fileName(),
    mimeType: faker.system.mimeType(),
    size: faker.number.int({ min: 100, max: 10000 }),
    storageKey: faker.system.filePath(),
    storageProvider: "local",
    checksum: faker.string.hexadecimal({ length: 64 }),
    tags: ["test", "doc"],
    metadata: {},
    uploadedBy: ownerId,
    currentVersion: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
  await db.insert(documents).values(data)
  return data
}

export const createMinimalSeedData = async (options?: { users?: number; documents?: number }) => {
  const [user] = await seedUsers(options?.users ?? 1)
  const documents = await seedDocuments(user.id, options?.documents ?? 2)
  return { user, documents }
}




