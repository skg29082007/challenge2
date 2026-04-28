import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";

const HEADER = "x-request-id";

/**
 * Assigns a stable request id to every incoming request.
 *
 * If the upstream proxy / client provides `x-request-id`, we trust and forward
 * it (useful for correlating logs across services). Otherwise a fresh UUID is
 * generated. The id is also echoed back as a response header so clients can
 * report it when filing bug reports.
 */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header(HEADER);
  const id = incoming && /^[\w-]{1,128}$/.test(incoming) ? incoming : randomUUID();
  (req as unknown as { id: string }).id = id;
  res.setHeader(HEADER, id);
  next();
};
