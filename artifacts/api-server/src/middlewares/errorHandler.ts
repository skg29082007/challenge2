import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../lib/errors";

/**
 * 404 handler — used as the last route so every unmatched API path returns
 * a consistent JSON shape instead of HTML or an empty response.
 */
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
};

/**
 * Centralized JSON error handler.
 *
 * - Converts AppError instances into their declared status / code.
 * - Hides internal error messages and stack traces in production.
 * - Always logs via pino-http's request-bound logger so errors are
 *   correlated with the originating request id.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const isProd = process.env.NODE_ENV === "production";

  if (err instanceof AppError) {
    req.log?.warn?.({ err, code: err.code }, "Handled AppError");
    res.status(err.status).json({
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Body parser size errors (express.json with `limit`)
  if ((err as { type?: string })?.type === "entity.too.large") {
    res.status(413).json({ error: "Payload too large", code: "PAYLOAD_TOO_LARGE" });
    return;
  }

  req.log?.error?.({ err }, "Unhandled error");
  res.status(500).json({
    error: isProd ? "Internal server error" : (err as Error).message,
    code: "INTERNAL_ERROR",
  });
};
