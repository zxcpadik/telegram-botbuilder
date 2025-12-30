export class BotError extends Error {
  public readonly code: string;
  public readonly chat_id?: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    chat_id?: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "BotError";
    this.code = code;
    this.chat_id = chat_id;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BotError);
    }
  }
}