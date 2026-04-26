// Provide required env vars before any module that reads them at import-time
// (e.g. the Gemini integration client) is loaded.
process.env.AI_INTEGRATIONS_GEMINI_BASE_URL ??= "http://example.invalid";
process.env.AI_INTEGRATIONS_GEMINI_API_KEY ??= "test-key";
process.env.PORT ??= "0";
process.env.NODE_ENV ??= "test";
