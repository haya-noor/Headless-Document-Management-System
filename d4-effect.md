Drizzle Models, Migrations & Repository Contracts

Create tables using shared columns; apply FKs, uniques, indexes. Define repository contracts (interfaces) with typed errors alongside pagination types.

Tasks:

    Create database tables for core entities with proper relationships and constraints.
    Apply database constraints for data integrity, indexing for performance, and foreign key relationships.
    Generate and run migrations; ensure type inference from schema definitions.
    Define repository interfaces with effectful signatures, typed errors, and pagination support.

Acceptance:

    Migrations run cleanly; schema reflects domain; types inferred.
    Testcontainers migration tests (up/down) pass.
    Repository interfaces compile with effectful signatures and typed errors; no infra leakage.

References: infrastrcture-overview.mdx (SharedColumns, FK)

Expectations:

    SharedColumns and app-generated UUIDs are mandatory.
    Correct relational constraints: FKs, unique(slug, workspaceId), indexes, check(version >= 1).
    Drizzle proficiency: inferred types, reversible migrations, basic seeding approach.
    Repository boundaries: effectful interfaces only; typed errors; pagination contracts (Paginated<T> output).
