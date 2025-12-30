import type TelegramBot from "node-telegram-bot-api";

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

export interface CustomLogger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

export interface LoggerConfig {
  /** Log level (default: "info") */
  level?: LogLevel;
  /** Custom logger implementation */
  custom_logger?: CustomLogger;
}

export interface BotConfig {
  /** Telegram bot token */
  token: string;

  /** node-telegram-bot-api options */
  telegram_options?: TelegramBot.ConstructorOptions;

  /** Enable /start command handling (default: true) */
  enable_start_command?: boolean;

  /** Parse mode for messages (default: "HTML") */
  default_parse_mode?: "HTML" | "Markdown" | "MarkdownV2";

  /** Logger configuration */
  logger?: LoggerConfig;

  /** Enable schema validation on startup (default: true) */
  validate_schema?: boolean;

  /** Auto-delete user messages in dialogs (default: true) */
  auto_delete_user_messages?: boolean;

  /** Timeout for waiting input in ms (default: 300000 = 5 min) */
  default_input_timeout?: number;
}

export const DEFAULT_CONFIG: Required<Omit<BotConfig, "token" | "telegram_options" | "logger">> & {
  logger: Required<LoggerConfig>;
} = {
  enable_start_command: true,
  default_parse_mode: "HTML",
  validate_schema: true,
  auto_delete_user_messages: true,
  default_input_timeout: 300000,
  logger: {
    level: "info",
    custom_logger: undefined!,
  },
};