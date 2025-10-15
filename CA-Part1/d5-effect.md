Implement Drizzle repositories and complete integration tests.

Tasks:

    Implement serialization helpers for transforming domain entities to/from database format.
    Implement repository methods for CRUD operations, querying, and data retrieval with pagination.
    Create seed datasets for integration testing; verify query performance and index usage.

Acceptance:

    E2E round-trip: create document → add version → fetch latest → update → list.
    Integration tests green against Postgres Testcontainers; coverage targets met (Domain ≥ 90%, Repos ≥ 80%).

Expectations:

    Queries leverage proper indexes; avoid unnecessary sequential scans.
    Integration tests run against real Postgres with Testcontainers; deterministic seeds.
    Repository layer achieves target coverage; assertions focus on behavior, not implementation.




Infrastructure Testing Overview
What we test

    CRUD: add, fetchByUserId, update, remove
    Queries: existsByUserId, fetchByPhoneNumber, fetchWithCompleteProfiles (pagination)
    Edge cases: non-existent userId, unique userId constraint, cascade delete
    Serialization: nested VOs flattened to columns (address, social links)


1
Spin up a fresh DB and repository (per test)

Before each test, we boot a disposable database, instantiate the repository, and wipe tables so every run starts from zero. After each test, we clean up the database resources. In short: beforeEach(async () => { ... }) brings up a clean state, and afterEach(async () => { ... }) tears it down.
2
First Test: Basic CREATE and READ Testing

Verifies add(...) persists and fetchByUserId(...) returns Option.Some with the same entity.
3
Update: change fields and persist

Uses update(...) to change persisted fields and re-fetches to assert the mutations are saved.
4
Query by phone number

Exercises fetchByPhoneNumber(...): expects a non-empty list containing the created host.
5
Remove and verify deletion

Calls remove(id) and verifies fetchByUserId(...) returns Option.None afterward.
6
Existence check

Validates existsByUserId(...) toggles from false to true after inserting a host.
7
Pagination: only complete profiles

Ensures fetchWithCompleteProfiles(...) returns only hosts with complete profile fields (dob, phoneNumber, profileImage).
8
Non-existent userId

Checks fetchByUserId(...) for a non-existent UUID returns Option.None.