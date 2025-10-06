
Create test factories and comprehensive unit tests for entities and access control.

Tasks:

    Build test factories for all core entities with deterministic data generation.
    Write entity-specific tests covering validation, creation, and serialization behavior.
    Write domain service tests covering permission evaluation scenarios and access control rules.
    Optional: property-based tests for domain invariants and edge cases.

Acceptance:

    Factories exist for all core entities; unit tests pass and cover happy/edge paths.
    Domain coverage target met (≥ 90% lines/branches for entities and access service).

Expectations:

    Keep tests pure (no IO) for domain; use fakes/builders instead of DB.
    Clear, minimal assertions that reflect behavior not implementation details.

Rules:

Entity Test Factory Patterns
1: Schema Foundation with Faker Annotations
Start by extending your base entity schema with faker-based annotations. This provides the foundation for generating realistic test data while maintaining type safety.
2: Handling Union Types with Members
Union types in Effect Schema require special handling. Use members[0] to access the first member of a union and add annotations to it.
3: Smart Optional Field Generation
Optional fields need special handling with S.encodedBoundSchema and probability-based generation. This allows you to control how often optional fields are populated.
4: Organizing Complex Generators
Move complex generation logic into dedicated objects for better organization and reusability. This keeps the schema clean and makes generators testable.
5: Nested Value Object Generators
Handle complex nested structures like addresses with dedicated generator objects. This maintains separation of concerns and makes the code more maintainable.
6: Base Generator Function
Create the main generator function that uses FastCheck to sample from your schema. This provides type-safe generation with override capabilities.
7: Scenario-Based Helper Methods
Build helper methods for common testing scenarios. These methods use the base generator internally but provide convenient presets for specific use cases.
8: Database Integration
Create database-specific factory functions that handle the repository pattern and proper type conversion for database insertion.
9: Entity Creation Utilities
Build Effect-based utilities for creating domain entities directly. This provides functional error handling and composability for complex test scenarios.

Essential Entity Testing Patterns
1: Basic Entity Creation & Validation
Start with fundamental entity creation tests using your factory. Test both successful creation and validation failures to ensure your domain rules are properly enforced.
2: Factory Constraint Testing
Validate that your factory generates data within expected constraints. This ensures your test data remains realistic and doesn't accidentally violate domain rules.
3: Option Type Handling
Test optional fields thoroughly since they're common in domain entities. Verify both presence and absence scenarios work correctly.
4: Computed Properties & Business Logic
Test computed properties and business logic methods. These often contain complex domain rules that need thorough validation.
5: Factory Override Testing
Test factory overrides systematically to ensure your factories behave predictably when customizing test data for specific scenarios.
6: Error Handling & Edge Cases
Test validation errors and edge cases to ensure your domain boundaries are properly enforced.
7: Serialization & Data Integrity
Test serialization round-trips and data integrity to ensure entities can be safely stored and retrieved.