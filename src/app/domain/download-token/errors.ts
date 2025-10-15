import { RepositoryError } from "../shared/errors"

/** Token not found */
export class DownloadTokenNotFoundError extends RepositoryError {
  readonly _tag = "DownloadTokenNotFoundError"
  constructor(
    public readonly field: string,
    public readonly value: unknown,
    details?: string
  ) {
    super(`Download token not found for ${field}: ${value}${details ? ` - ${details}` : ""}`, "DOWNLOAD_TOKEN_NOT_FOUND")
  }
}

/** Token validation failure */
export class DownloadTokenValidationError extends RepositoryError {
  readonly _tag = "DownloadTokenValidationError"
  constructor(message: string, public readonly field?: string, public readonly value?: unknown) {
    super(message, "DOWNLOAD_TOKEN_VALIDATION_ERROR")
  }
}

/** Token already used */
export class DownloadTokenAlreadyUsedError extends RepositoryError {
  readonly _tag = "DownloadTokenAlreadyUsedError"
  constructor(public readonly field: string, public readonly value: unknown, details?: string) {
    super(`Download token already used for ${field}: ${value}${details ? ` - ${details}` : ""}`, "DOWNLOAD_TOKEN_ALREADY_USED")
  }
}

export type DownloadTokenErrorType =
  | DownloadTokenNotFoundError
  | DownloadTokenValidationError
  | DownloadTokenAlreadyUsedError
