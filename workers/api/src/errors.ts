import type { Context } from "hono";
import { ERROR_STATUS, type ApiError, type ErrorCode } from "@paddock/shared";

/** An API contract error (D-06). The message is public: it never carries internal details. */
export class HttpError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

export function errorResponse(c: Context, code: ErrorCode, message: string, retryAfter?: number): Response {
  const body: ApiError = { error: { code, message } };
  const headers: Record<string, string> = { "cache-control": "no-store" };
  if (retryAfter !== undefined) headers["retry-after"] = String(retryAfter);
  return c.json(body, ERROR_STATUS[code] as 400, headers);
}
