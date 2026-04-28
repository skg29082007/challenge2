import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import {
  chatRequestSchemaForTesting,
  explainRequestSchemaForTesting,
} from "../routes/chat";

/**
 * Pure-schema and HTTP-level input validation tests.
 *
 * These guard the contract that:
 *  - Required fields are required.
 *  - Min / max bounds are enforced for both message arrays and string lengths.
 *  - Strict-mode schemas reject unknown fields (so clients cannot smuggle
 *    extra keys past validation).
 *  - Validation failures consistently return HTTP 400 with the same JSON shape.
 */
describe("request validation", () => {
  describe("chatRequestSchema (unit)", () => {
    it("accepts a single short user message", () => {
      const res = chatRequestSchemaForTesting.safeParse({
        messages: [{ role: "user", content: "What is a primary?" }],
      });
      expect(res.success).toBe(true);
    });

    it("rejects an empty messages array", () => {
      const res = chatRequestSchemaForTesting.safeParse({ messages: [] });
      expect(res.success).toBe(false);
    });

    it("rejects more than 40 messages", () => {
      const messages = Array.from({ length: 41 }, () => ({
        role: "user" as const,
        content: "hi",
      }));
      const res = chatRequestSchemaForTesting.safeParse({ messages });
      expect(res.success).toBe(false);
    });

    it("rejects messages with content > 2000 chars", () => {
      const res = chatRequestSchemaForTesting.safeParse({
        messages: [{ role: "user", content: "a".repeat(2001) }],
      });
      expect(res.success).toBe(false);
    });

    it("rejects unknown roles", () => {
      const res = chatRequestSchemaForTesting.safeParse({
        messages: [{ role: "system", content: "hi" }],
      });
      expect(res.success).toBe(false);
    });

    it("rejects unknown top-level fields (strict mode)", () => {
      const res = chatRequestSchemaForTesting.safeParse({
        messages: [{ role: "user", content: "hi" }],
        sneaky: "field",
      });
      expect(res.success).toBe(false);
    });

    it("rejects unknown fields inside a message (strict mode)", () => {
      const res = chatRequestSchemaForTesting.safeParse({
        messages: [{ role: "user", content: "hi", extra: "x" }],
      });
      expect(res.success).toBe(false);
    });
  });

  describe("explainRequestSchema (unit)", () => {
    it("accepts a term alone", () => {
      const res = explainRequestSchemaForTesting.safeParse({ term: "Suffrage" });
      expect(res.success).toBe(true);
    });

    it("accepts a term with optional definition", () => {
      const res = explainRequestSchemaForTesting.safeParse({
        term: "Suffrage",
        definition: "The right to vote.",
      });
      expect(res.success).toBe(true);
    });

    it("rejects empty term", () => {
      const res = explainRequestSchemaForTesting.safeParse({ term: "" });
      expect(res.success).toBe(false);
    });

    it("rejects term > 80 chars", () => {
      const res = explainRequestSchemaForTesting.safeParse({ term: "a".repeat(81) });
      expect(res.success).toBe(false);
    });

    it("rejects definition > 400 chars", () => {
      const res = explainRequestSchemaForTesting.safeParse({
        term: "ok",
        definition: "x".repeat(401),
      });
      expect(res.success).toBe(false);
    });
  });

  describe("HTTP-level validation responses", () => {
    it("400 with VALIDATION_ERROR code on /api/chat with empty body", async () => {
      const res = await request(app).post("/api/chat").send({});
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("400 with VALIDATION_ERROR code on /api/glossary/explain with no term", async () => {
      const res = await request(app).post("/api/glossary/explain").send({});
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });

    it("includes a `details` field that names which fields failed", async () => {
      const res = await request(app)
        .post("/api/chat")
        .send({ messages: [{ role: "weird", content: "" }] });
      expect(res.status).toBe(400);
      expect(res.body.details).toBeDefined();
    });
  });
});
