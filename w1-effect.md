Implement Document and DocumentVersion along with Value Objects to encapsulate invariants.

Tasks:

    Define schemas for core document entities with proper field types and optional properties.
    Create value objects for domain-specific types like identifiers, checksums, and file references.

Acceptance:

    Document and DocumentVersion entities with value objects implemented and working.

References: domain-overview.mdx (Option, guards-in-schema, static factory methods, serialization)

Expectations:

    Domain purity and immutability; no infrastructure concerns in entities/VOs; use private constructor + factories.
    Entities vs Value Objects: invariants enforced via schema guards; value semantics for VOs.
    Use rich objects instead of primitives and refined types; avoid null/undefined in domain types with Option/Effect.
    Schema-first approach: derive types from Effect/Schema. Serialization symmetry: encode/decode round-trip holds.
    Add refined types for IDs (UUID) and dates (DateTime) with proper schema declarations for encoding/decoding between domain and persistence layers.
    Create dedicated guards and error files for domains (e.g., document.guards.ts, document.errors.ts) to maintain clear separation and reusability.
