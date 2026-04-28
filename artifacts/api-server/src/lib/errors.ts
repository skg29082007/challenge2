/**
 * Domain-specific error classes for the ElectEd API.
 *
 * Throwing these from any route handler lets the centralized error middleware
 * convert them into a consistent JSON shape with the right HTTP status code,
 * without leaking stack traces or implementation details to the client.
 */

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, status = 500, code = "INTERNAL_ERROR", details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(details?: unknown) {
    super("Invalid request body", 400, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class UpstreamError extends AppError {
  constructor(message = "AI service unavailable") {
    super(message, 502, "UPSTREAM_ERROR");
    this.name = "UpstreamError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}
