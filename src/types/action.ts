import type TelegramBot from "node-telegram-bot-api";
import type { BotBuilder } from "../core/bot_builder.js";

export interface ActionContext {
  /** Chat ID */
  chat_id: number;

  /** Bot instance */
  bot: BotBuilder;

  /** Additional arguments passed to action */
  args?: unknown[];

  /** Raw message (if available) */
  message?: TelegramBot.Message;

  /** Raw callback query (if available) */
  callback_query?: TelegramBot.CallbackQuery;

  /** Matched command arguments (for command actions) */
  command_args?: string;
}

export interface DialogActionContext extends ActionContext {
  /** Previous dialog ID (for on_enter) or new dialog ID (for on_leave) */
  other_dialog_id: string | undefined;
}

export type Action = (context: ActionContext) => void | Promise<void>;

export type DialogAction = (context: DialogActionContext) => void | Promise<void>;

export type CallbackFunction = (chat_id: number, ...args: unknown[]) => void | Promise<void>;

export type InputType = "text" | "document" | "photo" | "video" | "audio" | "voice" | "contact" | "location";

export interface WaitForInputOptions {
  /** Timeout in milliseconds (default: from config) */
  timeout?: number;

  /** Allowed input types (default: depends on wait function) */
  input_types?: InputType[];

  /** Validation function - return true if valid, string for error message */
  validator?: (input: string) => boolean | string | Promise<boolean | string>;

  /** Message to show on validation failure */
  validation_error_message?: string;

  /** Message to show on timeout */
  timeout_message?: string;

  /** Cancel keywords (default: ["/cancel"]) */
  cancel_keywords?: string[];

  /** Message to show on cancel */
  cancel_message?: string;
}

export interface WaitResult<T = string> {
  success: boolean;
  value?: T;
  cancelled?: boolean;
  timed_out?: boolean;
  error?: string;
}

export interface FileWaitResult {
  success: boolean;
  file_id?: string;
  file_content?: string;
  file_name?: string;
  mime_type?: string;
  cancelled?: boolean;
  timed_out?: boolean;
  error?: string;
}