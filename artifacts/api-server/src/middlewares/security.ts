import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

/**
 * Production-grade security header bundle.
 *
 * - Disables `X-Powered-By` (info disclosure).
 * - Sets HSTS, X-Content-Type-Options, Referrer-Policy, X-Frame-Options.
 * - Adds a strict Permissions-Policy that disables sensitive browser APIs.
 * - CSP is intentionally NOT applied here because this server only serves
 *   JSON; the static frontend manages its own CSP.
 */
export const securityHeaders: RequestHandler[] = [
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      includeSubDomains: true,
      preload: false,
    },
    frameguard: { action: "deny" },
  }),
  (_req, res, next) => {
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
    );
    next();
  },
];

/**
 * Per-IP rate limit for AI endpoints.
 *
 * Gemini calls cost real money and are slow. We allow 30 requests / minute
 * per IP for normal chatting, which comfortably covers any human user but
 * blocks runaway scripts and abuse.
 */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down.", code: "RATE_LIMITED" },
  // Honest source IP behind Replit's proxy.
  keyGenerator: (req) => {
    const fwd = req.header("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]!.trim();
    return req.ip ?? "unknown";
  },
});

/**
 * A tighter rate limit for write-heavy endpoints (currently the streaming
 * endpoint, which holds an open connection while the model generates).
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down.", code: "RATE_LIMITED" },
});
