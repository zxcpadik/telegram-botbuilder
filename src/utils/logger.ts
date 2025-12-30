import type { LogLevel, LoggerConfig, CustomLogger } from "../types/config.js";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m",  // green
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
  silent: "",
};

const RESET_COLOR = "\x1b[0m";

export class Logger {
  private readonly level: number;
  private readonly custom: CustomLogger | undefined;
  private readonly use_colors: boolean;

  constructor(config?: LoggerConfig) {
    this.level = LOG_LEVELS[config?.level ?? "info"];
    this.custom = config?.custom_logger;
    this.use_colors = process.stdout.isTTY ?? false;
  }

  private format_message(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const level_upper = level.toUpperCase().padEnd(5);

    if (this.use_colors) {
      const color = LEVEL_COLORS[level];
      return `${color}[${timestamp}] [${level_upper}]${RESET_COLOR} ${message}`;
    }

    return `[${timestamp}] [${level_upper}] ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.level > LOG_LEVELS.debug) return;

    if (this.custom) {
      this.custom.debug(message, ...args);
    } else {
      console.debug(this.format_message("debug", message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.level > LOG_LEVELS.info) return;

    if (this.custom) {
      this.custom.info(message, ...args);
    } else {
      console.info(this.format_message("info", message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.level > LOG_LEVELS.warn) return;

    if (this.custom) {
      this.custom.warn(message, ...args);
    } else {
      console.warn(this.format_message("warn", message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.level > LOG_LEVELS.error) return;

    if (this.custom) {
      this.custom.error(message, ...args);
    } else {
      console.error(this.format_message("error", message), ...args);
    }
  }

  /** Create a child logger with a prefix */
  child(prefix: string): Logger {
    const parent = this;
    const prefixed_logger: CustomLogger = {
      debug: (msg, ...args) => parent.debug(`[${prefix}] ${msg}`, ...args),
      info: (msg, ...args) => parent.info(`[${prefix}] ${msg}`, ...args),
      warn: (msg, ...args) => parent.warn(`[${prefix}] ${msg}`, ...args),
      error: (msg, ...args) => parent.error(`[${prefix}] ${msg}`, ...args),
    };

    return new Logger({
      level: Object.entries(LOG_LEVELS).find(([_, v]) => v === this.level)?.[0] as LogLevel,
      custom_logger: prefixed_logger,
    });
  }
}

/** Global silent logger for disabled logging */
export const SILENT_LOGGER = new Logger({ level: "silent" });