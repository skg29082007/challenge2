import { Router, type IRouter } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import { z } from "zod";

const router: IRouter = Router();

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
});

const explainRequestSchema = z.object({
  term: z.string().min(1).max(80),
});

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

export const chatRequestSchemaForTesting = chatRequestSchema;
export const explainRequestSchemaForTesting = explainRequestSchema;

router.post("/chat", async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: parsed.data.messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
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
    res.status(502).json({ error: "AI service unavailable" });
  }
});

router.post("/chat/stream", async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
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
      contents: parsed.data.messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
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

router.post("/glossary/explain", async (req, res) => {
  const parsed = explainRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
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
    res.status(502).json({ error: "AI service unavailable" });
  }
});

export default router;
