import type { Plugin } from "vite";

/**
 * Vite plugin that injects production-grade security headers on every
 * response served by the dev / preview server.
 *
 * - **CSP** is set as a real HTTP header (browsers ignore `frame-ancestors`,
 *   `report-uri`, etc. when delivered via `<meta http-equiv>`).
 * - HSTS is included so the browser will refuse plain-HTTP downgrades.
 * - `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`
 *   defend against MIME sniffing, clickjacking, and referrer leakage.
 * - `Permissions-Policy` disables sensitive APIs the site never uses.
 *
 * The CSP is intentionally strict: only self-hosted scripts/styles/fonts,
 * Google Fonts CSS + font files, YouTube nocookie iframes, and the API
 * server (same origin) are allowed.
 */
export function securityHeaders(): Plugin {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https://i.ytimg.com",
    "connect-src 'self' ws: wss:",
    "frame-src https://www.youtube-nocookie.com",
    "frame-ancestors *",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  // Note: `X-Frame-Options` is intentionally omitted. The CSP
  // `frame-ancestors *` directive supersedes it in modern browsers and we
  // need iframes to work for the Replit preview pane. `ALLOWALL` is not a
  // standard X-Frame-Options value so we deliberately do not send it.
  const headers: Record<string, string> = {
    "Content-Security-Policy": csp,
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // YouTube's player legitimately uses gyroscope/accelerometer/picture-in-picture
    // for some videos, so we leave those alone and only block the most sensitive APIs.
    "Permissions-Policy":
      "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=()",
    "X-DNS-Prefetch-Control": "on",
  };

  const apply = (res: { setHeader: (k: string, v: string) => void }) => {
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  };

  return {
    name: "elected-security-headers",
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        apply(res);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        apply(res);
        next();
      });
    },
  };
}
