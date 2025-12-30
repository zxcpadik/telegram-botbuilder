import type TelegramBot from "node-telegram-bot-api";
import type { BotBuilder } from "../core/bot_builder.js";

export type UpdateType = "message" | "callback_query" | "command" | "document" | "photo" | "contact" | "location";

export interface MiddlewareContext {
  /** Chat ID */
  chat_id: number;

  /** Bot instance */
  bot: BotBuilder;

  /** Original message (if applicable) */
  message?: TelegramBot.Message;

  /** Callback query (if applicable) */
  callback_query?: TelegramBot.CallbackQuery;

  /** Type of update being processed */
  update_type: UpdateType;

  /** User ID */
  user_id: number;

  /** Username (if available) */
  username?: string;

  /** Raw update timestamp */
  timestamp: number;
}

export type MiddlewareNext = () => Promise<void>;

export type Middleware = (
  context: MiddlewareContext,
  next: MiddlewareNext
) => void | Promise<void>;