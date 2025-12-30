import type { Action } from "./action.js";
import type { Dialog, Command } from "./dialog.js";

export interface Schema {
  /** Starting dialog ID */
  start_dialog: string;

  /** All dialogs */
  dialogs: Dialog[];

  /** Bot commands (will be registered with BotFather format) */
  commands?: Command[];

  /** Global error dialog ID (shown on unhandled errors) */
  error_dialog?: string;

  /** Global fallback handler for unmatched messages */
  fallback_action?: Action;

  /** Fallback for unmatched reply keyboard buttons */
  reply_fallback_action?: Action;
}