import { Router, type IRouter, type Request, type Response } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import { z } from "zod";
import { ValidationError, UpstreamError } from "../lib/errors";
import { aiRateLimiter, strictRateLimiter } from "../middlewares/security";

const router: IRouter = Router();

/**
 * Strict request schemas. `.strict()` rejects any unknown fields so a
 * misbehaving client cannot smuggle extra data through.
 */
const messageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(2000),
  })
  .strict();

const chatRequestSchema = z
  .object({
    messages: z.array(messageSchema).min(1).max(40),
  })
  .strict();

const explainRequestSchema = z
  .object({
    term: z.string().trim().min(1).max(80),
    definition: z.string().trim().max(400).optional(),
  })
  .strict();

const SYSTEM_PROMPT =
  "You are ElectEd, a friendly nonpartisan election education assistant. " +
  "Explain concepts simply in 3-5 sentences. " +
  "Never express political opinions or endorse candidates or parties. " +
  "If asked about a specific candidate's merits, redirect to neutral civic education. " +
  "Use plain language a first-time voter can understand.";

const GLOSSARY_PROMPT =
  "You are a nonpartisan civics educator. " +
  "Given a single election-related term, write a concise (max 60 words), neutral, plain-language explanation suitable for a first-time voter. " +
  "Do not use markdown formatting. Do not list multiple definitions. Output only the explanation.";

// Re-exported for unit tests so we can validate the same schemas the server uses.
export const chatRequestSchemaForTesting = chatRequestSchema;
export const explainRequestSchemaForTesting = explainRequestSchema;

/**
 * Convert ElectEd chat messages into the Gemini `Content[]` format.
 * Centralized so streaming and non-streaming endpoints stay in sync.
 */
function toGeminiContents(messages: z.infer<typeof messageSchema>[]) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

router.post("/chat", aiRateLimiter, async (req: Request, res: Response) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.flatten());
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: toGeminiContents(parsed.data.messages),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 8192,
        temperature: 0.3,
      },
    });

    const text = response.text ?? "";
    res.json({ reply: text });
  } catch (err) {
    req.log.error({ err }, "Gemini chat failed");
    throw new UpstreamError();
  }
});

router.post("/chat/stream", strictRateLimiter, async (req: Request, res: Response) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.flatten());
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: toGeminiContents(parsed.data.messages),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 8192,
        temperature: 0.3,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text ?? "";
      if (text) send({ type: "delta", text });
    }
    send({ type: "done" });
    res.end();
  } catch (err) {
    req.log.error({ err }, "Gemini chat stream failed");
    send({ type: "error", message: "AI service unavailable" });
    res.end();
  }
});

router.post("/glossary/explain", aiRateLimiter, async (req: Request, res: Response) => {
  const parsed = explainRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.flatten());
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `Term: ${parsed.data.term}` }],
        },
      ],
      config: {
        systemInstruction: GLOSSARY_PROMPT,
        maxOutputTokens: 256,
        temperature: 0.2,
      },
    });

    const text = (response.text ?? "").trim();
    res.json({ term: parsed.data.term, explanation: text });
  } catch (err) {
    req.log.error({ err }, "Gemini glossary explain failed");
    throw new UpstreamError();
  }
});

export default router;
