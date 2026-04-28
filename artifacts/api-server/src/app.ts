import express, { type Express } from "express";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { requestId } from "./middlewares/requestId";
import { securityHeaders } from "./middlewares/security";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

const app: Express = express();

// Trust the first proxy hop so `req.ip` and `X-Forwarded-For` work correctly
// behind Replit's HTTPS proxy. This is required for fair rate limiting.
app.set("trust proxy", 1);
// Disable framework fingerprinting; helmet sets this too but we belt-and-brace.
app.disable("x-powered-by");

app.use(requestId);
app.use(...securityHeaders);

app.use(
  pinoHttp({
    logger,
    customProps: (req) => ({ requestId: (req as unknown as { id?: string }).id }),
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: true,
    credentials: false,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Request-Id"],
    maxAge: 86400,
  }),
);

app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      // Don't compress server-sent events / streaming responses.
      const contentType = res.getHeader("Content-Type");
      if (typeof contentType === "string" && contentType.includes("text/event-stream")) {
        return false;
      }
      return compression.filter(req, res);
    },
  }),
);

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.use("/api", router);

// 404 + centralized error handler must be registered last.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
