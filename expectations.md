Headless Document Management System
A comprehensive backend training project that teaches clean architecture, domain-driven design, and modern TypeScript development through building a document management system

About the project
Headless API for documents, metadata, permissions, search, and short-lived downloads.


Future Integration: 
For Future Integration -> Not required for now. so write the code in such a way that it's flexible/scalable 
Storage: S3-compatible object store (minio/S3/GCS) + CDN optional.
Security: JWT auth, RBAC (Admin, User), pre-signed URLs, strict input validation.
Search: Filter by tags, metadata (key/value), filename, content-type; pagination & sort.
Versioning & Audit: Immutable file versions, basic audit trail (who/when/what).


Principles
Before listing what we have adapted so far we like to explain what are we optimizing for this will serve as good key results or a litmus test to check if you have achieved good architecture

Independent of Frameworks. Express/Koa is not your application.The architecture does not depend on the existence of some library of feature laden software. This allows you to use such frameworks as tools, rather than having to cram your system into their limited constraints.
Testable. The business rules can be tested without the UI, Database, Web Server, or any other external element.
Independent of UI. The UI can change easily, without changing the rest of the system. A Web UI could be replaced with a console UI, for example, without changing the business rules.
Independent of Database. You can swap out Oracle or SQL Server, for Mongo, BigTable, CouchDB, or something else. Your business rules are not bound to the database.
Independent of any external agency. In fact your business rules simply don’t know anything at all about the outside world.
Shippable right from the beginning. Being agile as the defacto for every tech company it's really important, We have to make sure we can use declarative formats for setup, so it's much easier to bring on new engineer.
Being Resilient. In this new API economy, relying on 3rd party systems is inevitable, resilient means allow systems to work with failure, rather than against it.
Scalable Applications should scale right from the start, It doesn't necessarily mean we are optimizing for performance or efficiency. It means our apps are distributed system friendly by being stateless and developer friendly by being readable which affects how quickly we can onboard a new developer.


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