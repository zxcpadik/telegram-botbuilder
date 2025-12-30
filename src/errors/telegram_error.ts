import { BotError } from "./bot_error.js";

export class TelegramError extends BotError {
  public readonly telegram_error_code?: number;
  public readonly telegram_description?: string;

  constructor(
    message: string,
    chat_id?: number,
    telegram_error_code?: number,
    telegram_description?: string
  ) {
    super(message, "TELEGRAM_ERROR", chat_id, {
      telegram_error_code,
      telegram_description,
    });
    this.name = "TelegramError";
    this.telegram_error_code = telegram_error_code;
    this.telegram_description = telegram_description;
  }

  public static from_error(error: unknown, chat_id?: number): TelegramError {
    if (error instanceof TelegramError) {
      return error;
    }

    const err = error as Error & { code?: number; response?: { body?: { description?: string } } };
    const message = err.message || "Unknown Telegram error";
    const code = err.code;
    const description = err.response?.body?.description;

    return new TelegramError(message, chat_id, code, description);
  }

  public is_message_not_modified(): boolean {
    return this.message.includes("message is not modified");
  }

  public is_message_not_found(): boolean {
    return this.message.includes("message to edit not found") ||
           this.message.includes("message to delete not found");
  }

  public is_blocked_by_user(): boolean {
    return this.message.includes("bot was blocked by the user") ||
           this.message.includes("user is deactivated");
  }

  public is_chat_not_found(): boolean {
    return this.message.includes("chat not found");
  }
}