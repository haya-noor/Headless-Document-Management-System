Add User and AccessPolicy entities. Create a DocumentAccessService (domain service) to evaluate permissions.

Tasks:

    Create user entity with role-based access control fields and workspace associations.
    Create access policy entity for managing permissions on resources with subject-based rules.
    Define permission action types for different access levels.
    Implement domain service for evaluating document access permissions using user and policy data.

Acceptance:

    User and AccessPolicy entities with proper guards and error handling.
    DocumentAccessService domain service with permission evaluation logic.
    Permission checks are pure (no IO) and deterministic; precedence: Admin > explicit subject policy > role policy > default deny.

Expectations:

    Domain service take User, AccessPolicy, and Document as input and return a boolean indicating if the user has the given permission.
    Domain service stays in domain layer (pure functions or Effect without external dependencies).
    Create dedicated guard and error files for User (user.guards.ts, user.errors.ts), AccessPolicy (access-policy.guards.ts, access-policy.errors.ts), and DocumentAccessService (document-access.errors.ts).
