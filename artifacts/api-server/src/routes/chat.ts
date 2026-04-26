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

const SYSTEM_PROMPT =
  "You are ElectEd, a friendly nonpartisan election education assistant. " +
  "Explain concepts simply in 3-5 sentences. " +
  "Never express political opinions or endorse candidates or parties. " +
  "If asked about a specific candidate's merits, redirect to neutral civic education. " +
  "Use plain language a first-time voter can understand.";

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

export default router;
