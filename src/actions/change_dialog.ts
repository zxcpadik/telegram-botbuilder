import type { Action } from "../types/action.js";

/**
 * Create an action that navigates to a specific dialog
 */
export function go_to(dialog_id: string): Action {
  return async (context) => {
    await context.bot.change_dialog(context.chat_id, dialog_id);
  };
}

/**
 * Create an action that navigates back to start dialog
 */
export function go_to_start(): Action {
  return async (context) => {
    await context.bot.reset_user(context.chat_id);
  };
}