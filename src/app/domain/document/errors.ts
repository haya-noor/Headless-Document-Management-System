/**
 * Document domain errors
 * Defines all domain-specific errors for document operations
 */

import { Data } from 'effect';

/**
 * Base document error class
 */
export class DocumentError extends Data.TaggedError('DocumentError')<{
  readonly message: string;  // error message
  readonly code: string; // error code
}> {}

/**
 * Document not found error
 * Data.TaggedError is a generic error class that can be used to create tagged errors 
 */
export class DocumentNotFoundError extends Data.TaggedError('DocumentNotFoundError')<{
  readonly documentId: string;
  readonly message?: string;
}> {
  constructor(documentId: string, message?: string) {
    super({
      documentId,
      message: message || `Document with ID ${documentId} not found`
    });
  }
}

/**
 * Document version not found error
 */
export class DocumentVersionNotFoundError extends Data.TaggedError('DocumentVersionNotFoundError')<{
  readonly documentId: string;
  readonly version: number;
  readonly message?: string;
}> {
  constructor(documentId: string, version: number, message?: string) {
    super({
      documentId,
      version,
      message: message || `Version ${version} of document ${documentId} not found`
    });
  }
}

/**
 * Invalid document state error
 * invalid state means: 
 * for example, if the document is in the draft state and the user tries to publish it,
 * then the document is in an invalid state
 */
export class InvalidDocumentStateError extends Data.TaggedError('InvalidDocumentStateError')<{
  readonly documentId: string;
  readonly currentState: string;
  readonly expectedState: string;
  readonly message?: string;
}> {
  constructor(documentId: string, currentState: string, expectedState: string, message?: string) {
    super({
      documentId,
      currentState,
      expectedState,
      message: message || `Document ${documentId} is in invalid state: ${currentState}, expected: ${expectedState}`
    });
  }
}

/**
 * Document validation error
 */
export class DocumentValidationError extends Data.TaggedError('DocumentValidationError')<{
  readonly field: string;    // field name that is invalid like filename, mimeType, etc
  readonly value: unknown;   // value that is invalid like 'test.pdf', 'application/pdf', etc
  readonly message: string;  // error message like 'Invalid filename format'
}> {
  constructor(field: string, value: unknown, message: string) {
    super({
      field,
      value,
      message: `Validation error for field '${field}': ${message}`
    });
  }
}

/**
 * Document permission error
 * super constructor is used to call the constructor of the parent class (Data.TaggedError) and pass the arguments of 
 * the child class (DocumentPermissionError) to the parent class constructor
 * 
 * Data.TaggedError is Effect's way of defining and handling errors with type safety instead of just throwing plain JS errors
 * Right now we are using Effect's  error checking and handling through the TaggedError class 
 */
export class DocumentPermissionError extends Data.TaggedError('DocumentPermissionError')<{
  readonly documentId: string;
  readonly userId: string;
  readonly requiredPermission: string;
  readonly message?: string;
}> {
  constructor(documentId: string, userId: string, requiredPermission: string, message?: string) {
    super({
      documentId,
      userId,
      requiredPermission,
      message: message || `User ${userId} lacks ${requiredPermission} permission for document ${documentId}`
    });
  }
}

/**
 * Document operation error
 */
export class DocumentOperationError extends Data.TaggedError('DocumentOperationError')<{
  readonly operation: string;  // operation name like create, update, delete, etc
  readonly documentId: string;
  readonly message: string;
}> {
  constructor(operation: string, documentId: string, message: string) {
    super({
      operation,
      documentId,
      message: `Operation '${operation}' failed for document ${documentId}: ${message}`
    });
  }
}

/**
 * Document storage error
 */
export class DocumentStorageError extends Data.TaggedError('DocumentStorageError')<{
  readonly storageKey: string; // storage key like 'documents/test.pdf'
  readonly operation: string;
  readonly message: string;
}> {
  constructor(storageKey: string, operation: string, message: string) {
    super({
      storageKey,
      operation,
      message: `Storage operation '${operation}' failed for key ${storageKey}: ${message}`
    });
  }
}

/**
 * Document version error
 */
export class DocumentVersionError extends Data.TaggedError('DocumentVersionError')<{
  readonly documentId: string;
  readonly version: number;
  readonly message: string;
}> {
  constructor(documentId: string, version: number, message: string) {
    super({
      documentId,
      version,
      message: `Version error for document ${documentId} version ${version}: ${message}`
    });
  }
}
