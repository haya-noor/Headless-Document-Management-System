

Use Bun and Elysia rather than Express


For future no needed for now, but the code should be scalable so in future if i want to include the following 
future inclusion i should be able to include them without changing the code much
Future inclusion:
not needed for now

    Storage: S3-compatible object store (minio/S3/GCS) + CDN optional.
    Security: JWT auth, RBAC (Admin, User), pre-signed URLs, strict input validation.
    Search: Filter by tags, metadata (key/value), filename, content-type; pagination & sort.
    Versioning & Audit: Immutable file versions, basic audit trail (who/when/what).




Tasks

API Endpoints:

    Build endpoints for uploading documents with metadata.
        Build endpoint for managing metadata.
        Build endpoints for managing permissions.
    Introduce JWT-based authentication for securing endpoints.
    Build endpoint for generating short lived download links for files.
    Implement advanced search filters for documents using tags and metadata.

Other:

    Cover gitflow and prepare a custom diagram in figjam. Goal is to visualize SDLC from git flow perspective
    Create services to abstract the logic away from controllers.
    Abstract away ORM model and create a physical store like APIs using repository pattern with interface for stores and their concrete implementation utilizing ORM models.

Expectations

    Use Express.js or Hono for HTTP framework with traditional REST endpoints.
    Use Drizzle ORM for database operations.
    Use application-generated UUIDs instead of database-generated IDs.
    Validate input using Zod schemas.
    Implement JWT-based authentication with middleware.
    Keep controllers thin: validate input, call services, return responses.
    Use repository pattern for data access with interface abstractions.
    Implement pagination with standard options and paginated responses.
    Prefer async/await over promises and callbacks.
