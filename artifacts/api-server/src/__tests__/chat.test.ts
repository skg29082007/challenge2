import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock the Gemini AI client BEFORE importing the app so the route module
// receives the mocked instance.
vi.mock("@workspace/integrations-gemini-ai", () => {
  return {
    ai: {
      models: {
        generateContent: vi.fn(),
        generateContentStream: vi.fn(),
      },
    },
  };
});

const { ai } = await import("@workspace/integrations-gemini-ai");
const app = (await import("../app")).default;
const {
  chatRequestSchemaForTesting,
  explainRequestSchemaForTesting,
} = await import("../routes/chat");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/chat - validation", () => {
  it("rejects empty body", async () => {
    const res = await request(app).post("/api/chat").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("rejects missing messages array", async () => {
    const res = await request(app).post("/api/chat").send({ foo: "bar" });
    expect(res.status).toBe(400);
  });

  it("rejects empty messages array", async () => {
    const res = await request(app).post("/api/chat").send({ messages: [] });
    expect(res.status).toBe(400);
  });

  it("rejects messages over 40 entries", async () => {
    const messages = Array.from({ length: 41 }, () => ({
      role: "user",
      content: "hi",
    }));
    const res = await request(app).post("/api/chat").send({ messages });
    expect(res.status).toBe(400);
  });

  it("rejects content over 2000 characters", async () => {
    const messages = [{ role: "user", content: "a".repeat(2001) }];
    const res = await request(app).post("/api/chat").send({ messages });
    expect(res.status).toBe(400);
  });

  it("rejects empty content string", async () => {
    const messages = [{ role: "user", content: "" }];
    const res = await request(app).post("/api/chat").send({ messages });
    expect(res.status).toBe(400);
  });

  it("rejects invalid role", async () => {
    const messages = [{ role: "system", content: "hi" }];
    const res = await request(app).post("/api/chat").send({ messages });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/chat - happy path", () => {
  it("forwards user messages to Gemini and returns reply", async () => {
    vi.mocked(ai.models.generateContent).mockResolvedValueOnce({
      text: "Voter registration is signing up to vote.",
    } as unknown as Awaited<ReturnType<typeof ai.models.generateContent>>);

    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [{ role: "user", content: "What is voter registration?" }] });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("Voter registration is signing up to vote.");
    expect(ai.models.generateContent).toHaveBeenCalledOnce();
    const args = vi.mocked(ai.models.generateContent).mock.calls[0]![0];
    expect(args.model).toBe("gemini-2.5-flash");
    expect(args.contents).toEqual([
      { role: "user", parts: [{ text: "What is voter registration?" }] },
    ]);
  });

  it("maps assistant role to model in Gemini request", async () => {
    vi.mocked(ai.models.generateContent).mockResolvedValueOnce({
      text: "ok",
    } as unknown as Awaited<ReturnType<typeof ai.models.generateContent>>);

    await request(app)
      .post("/api/chat")
      .send({
        messages: [
          { role: "user", content: "hi" },
          { role: "assistant", content: "hello" },
          { role: "user", content: "more" },
        ],
      });

    const args = vi.mocked(ai.models.generateContent).mock.calls[0]![0];
    expect(args.contents).toEqual([
      { role: "user", parts: [{ text: "hi" }] },
      { role: "model", parts: [{ text: "hello" }] },
      { role: "user", parts: [{ text: "more" }] },
    ]);
  });

  it("includes nonpartisan system instruction", async () => {
    vi.mocked(ai.models.generateContent).mockResolvedValueOnce({
      text: "ok",
    } as unknown as Awaited<ReturnType<typeof ai.models.generateContent>>);

    await request(app)
      .post("/api/chat")
      .send({ messages: [{ role: "user", content: "hi" }] });

    const args = vi.mocked(ai.models.generateContent).mock.calls[0]![0];
    expect(args.config?.systemInstruction).toMatch(/nonpartisan/i);
    expect(args.config?.temperature).toBeLessThanOrEqual(0.5);
  });

  it("returns empty reply if Gemini returns no text", async () => {
    vi.mocked(ai.models.generateContent).mockResolvedValueOnce(
      {} as Awaited<ReturnType<typeof ai.models.generateContent>>,
    );

    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [{ role: "user", content: "hi" }] });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("");
  });
});

describe("POST /api/chat - error handling", () => {
  it("returns 502 when Gemini throws", async () => {
    vi.mocked(ai.models.generateContent).mockRejectedValueOnce(new Error("boom"));

    const res = await request(app)
      .post("/api/chat")
      .send({ messages: [{ role: "user", content: "hi" }] });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("AI service unavailable");
  });
});

describe("POST /api/glossary/explain", () => {
  it("rejects missing term", async () => {
    const res = await request(app).post("/api/glossary/explain").send({});
    expect(res.status).toBe(400);
  });

  it("rejects term over 80 chars", async () => {
    const res = await request(app)
      .post("/api/glossary/explain")
      .send({ term: "a".repeat(81) });
    expect(res.status).toBe(400);
  });

  it("returns explanation for a valid term", async () => {
    vi.mocked(ai.models.generateContent).mockResolvedValueOnce({
      text: "Gerrymandering is the practice of drawing district lines to favor one party.",
    } as unknown as Awaited<ReturnType<typeof ai.models.generateContent>>);

    const res = await request(app)
      .post("/api/glossary/explain")
      .send({ term: "Gerrymandering" });

    expect(res.status).toBe(200);
    expect(res.body.term).toBe("Gerrymandering");
    expect(res.body.explanation).toMatch(/gerrymandering/i);
  });

  it("returns 502 on AI failure", async () => {
    vi.mocked(ai.models.generateContent).mockRejectedValueOnce(new Error("nope"));

    const res = await request(app)
      .post("/api/glossary/explain")
      .send({ term: "Filibuster" });

    expect(res.status).toBe(502);
  });
});

describe("Schema unit tests", () => {
  it("chat schema accepts valid payload", () => {
    const r = chatRequestSchemaForTesting.safeParse({
      messages: [{ role: "user", content: "hi" }],
    });
    expect(r.success).toBe(true);
  });

  it("chat schema rejects invalid role", () => {
    const r = chatRequestSchemaForTesting.safeParse({
      messages: [{ role: "system", content: "hi" }],
    });
    expect(r.success).toBe(false);
  });

  it("explain schema trims string length", () => {
    const r = explainRequestSchemaForTesting.safeParse({ term: "" });
    expect(r.success).toBe(false);
  });

  it("explain schema accepts valid term", () => {
    const r = explainRequestSchemaForTesting.safeParse({ term: "Caucus" });
    expect(r.success).toBe(true);
  });
});

describe("Streaming endpoint", () => {
  it("rejects invalid body before opening stream", async () => {
    const res = await request(app).post("/api/chat/stream").send({});
    expect(res.status).toBe(400);
  });
});
