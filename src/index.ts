// Main class
export { BotBuilder } from "./core/bot_builder.js";

// Actions
export {
  go_to,
  go_to_start,
  emit,
  call,
  call_with_context,
  wait_for_text,
  wait_for_file,
  wait_for_photo,
  notify,
  notify_dynamic,
  sequence,
  when,
  delay,
  when_data,
  set_data,
  delete_data,
} from "./actions/index.js";

// Types
export type {
  // Config
  LogLevel,
  CustomLogger,
  LoggerConfig,
  BotConfig,
  // Actions
  Action,
  ActionContext,
  DialogAction,
  DialogActionContext,
  CallbackFunction,
  InputType,
  WaitForInputOptions,
  WaitResult,
  FileWaitResult,
  // Keyboard
  InlineButton,
  ReplyButton,
  ReplyKeyboardOptions,
  ButtonSource,
  // Dialog
  TextSource,
  ImageSource,
  Dialog,
  Command,
  // Schema
  Schema,
  // Middleware
  UpdateType,
  MiddlewareContext,
  MiddlewareNext,
  Middleware,
  // Internal (advanced)
  UserState,
} from "./types/index.js";

// Errors
export {
  BotError,
  DialogError,
  DialogNotFoundError,
  InvalidDialogError,
  ValidationError,
  SchemaValidationError,
  InputValidationError,
  TelegramError,
} from "./errors/index.js";

// Utilities (advanced usage)
export { Logger } from "./utils/logger.js";
export { validate_schema, is_valid_schema } from "./validation/index.js";