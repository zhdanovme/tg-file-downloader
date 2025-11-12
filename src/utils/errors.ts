/**
 * Custom error classes for domain-specific errors
 */

export class BaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthError extends BaseError {
  constructor(message: string, code?: string) {
    super(message, code);
  }
}

export class ConfigError extends BaseError {
  constructor(message: string, code?: string) {
    super(message, code);
  }
}

export class DownloadError extends BaseError {
  constructor(message: string, code?: string) {
    super(message, code);
  }
}

export class NetworkError extends BaseError {
  constructor(message: string, code?: string) {
    super(message, code);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, code?: string) {
    super(message, code);
  }
}
