import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";

/**
 * Security headers, request id, payload limits, 404 shape, and CORS preflight.
 *
 * These tests pin the runtime behaviour of the security middleware bundle so a
 * future refactor cannot silently weaken the security posture of the API.
 */
describe("security middleware", () => {
  it("does not expose the X-Powered-By header", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("sets HSTS, content-type-options, frame-options and referrer-policy headers", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["strict-transport-security"]).toMatch(/max-age=\d+/);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("sets a strict Permissions-Policy that disables sensitive APIs", async () => {
    const res = await request(app).get("/api/health");
    const policy = res.headers["permissions-policy"];
    expect(policy).toBeDefined();
    expect(policy).toContain("camera=()");
    expect(policy).toContain("microphone=()");
    expect(policy).toContain("geolocation=()");
    expect(policy).toContain("payment=()");
    expect(policy).toContain("usb=()");
  });

  it("echoes a generated request id back to the client", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-request-id"]).toMatch(/^[\w-]{8,128}$/);
  });

  it("trusts a client-provided request id when it matches the safe pattern", async () => {
    const id = "req-abc-123";
    const res = await request(app).get("/api/health").set("x-request-id", id);
    expect(res.headers["x-request-id"]).toBe(id);
  });

  it("rejects unsafe (too-long or weird) client request ids and generates a new one", async () => {
    const evil = "x".repeat(500); // > 128 chars, must be ignored
    const res = await request(app).get("/api/health").set("x-request-id", evil);
    expect(res.headers["x-request-id"]).not.toBe(evil);
    expect(res.headers["x-request-id"]).toMatch(/^[\w-]{8,128}$/);
  });

  it("rejects oversized JSON bodies with HTTP 413", async () => {
    const huge = "x".repeat(150 * 1024); // 150 KB > 100 KB limit
    const res = await request(app)
      .post("/api/chat")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ messages: [{ role: "user", content: huge }] }));
    expect(res.status).toBe(413);
    expect(res.body.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("returns a structured 404 for unknown API routes", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found", code: "NOT_FOUND" });
  });

  it("answers CORS preflight (OPTIONS) requests successfully", async () => {
    const res = await request(app)
      .options("/api/chat")
      .set("Origin", "https://example.com")
      .set("Access-Control-Request-Method", "POST");
    expect([200, 204]).toContain(res.status);
    expect(res.headers["access-control-allow-origin"]).toBeDefined();
  });
});
