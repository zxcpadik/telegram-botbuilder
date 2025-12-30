/** Error messages for consistent messaging */
export const ERROR_MESSAGES = {
  DIALOG_NOT_FOUND: (id: string) => `Dialog "${id}" not found`,
  BUTTON_NOT_FOUND: (hash: string) => `Button with hash "${hash}" not found`,
  SCHEMA_INVALID: "Invalid schema provided",
  START_DIALOG_MISSING: "start_dialog must reference an existing dialog",
  NO_DIALOGS: "Schema must contain at least one dialog",
  DUPLICATE_DIALOG_ID: (id: string) => `Duplicate dialog ID: "${id}"`,
  DUPLICATE_COMMAND: (name: string) => `Duplicate command: "/${name}"`,
  INPUT_TIMEOUT: "Input timeout - operation cancelled",
  INPUT_CANCELLED: "Operation cancelled",
  VALIDATION_FAILED: (reason: string) => `Validation failed: ${reason}`,
} as const;

/** Telegram API error substrings for detection */
export const TELEGRAM_ERRORS = {
  MESSAGE_NOT_MODIFIED: "message is not modified",
  MESSAGE_NOT_FOUND: "message to edit not found",
  MESSAGE_DELETE_NOT_FOUND: "message to delete not found",
  BOT_BLOCKED: "bot was blocked by the user",
  USER_DEACTIVATED: "user is deactivated",
  CHAT_NOT_FOUND: "chat not found",
  QUERY_TOO_OLD: "query is too old",
} as const;

/** Default values */
export const DEFAULTS = {
  PARSE_MODE: "HTML" as const,
  INPUT_TIMEOUT_MS: 300000, // 5 minutes
  CANCEL_KEYWORDS: ["/cancel"],
  MAX_CALLBACK_DATA_LENGTH: 64,
  MAX_MESSAGE_LENGTH: 4096,
  MAX_CAPTION_LENGTH: 1024,
} as const;