Headless Document Management System
A comprehensive backend training project that teaches clean architecture, domain-driven design, and modern TypeScript development through building a document management system

About the project
Headless API for documents, metadata, permissions, search, and short-lived downloads.

Storage: S3-compatible object store (minio/S3/GCS) + CDN optional.
Security: JWT auth, RBAC (Admin, User), pre-signed URLs, strict input validation.
Search: Filter by tags, metadata (key/value), filename, content-type; pagination & sort.
Versioning & Audit: Immutable file versions, basic audit trail (who/when/what).


Pre Requisites
Proficiency in TypeScript (Custom Types, Interfaces, Type Utils, Classes, Generics, etc.)
Proficiency in Node.js or Bun.js: Concurrency management, Event Loop, and File & Streams.
Basic Understanding of 12 Factor Apps
Functional Programming: Composition, Currying, Higher-Order Functions (HOF), Functors, and Monads



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