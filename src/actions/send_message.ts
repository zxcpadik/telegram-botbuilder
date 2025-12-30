import type { Action } from "../types/action.js";

/**
 * Create an action that sends a standalone message
 */
export function notify(
  text: string,
  options?: {
    parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
    auto_delete_ms?: number;
  }
): Action {
  return async (context) => {
    const msg = await context.bot.send_message(context.chat_id, text, {
      parse_mode: options?.parse_mode,
    });

    if (options?.auto_delete_ms) {
      setTimeout(async () => {
        await context.bot.delete_message(context.chat_id, msg.message_id);
      }, options.auto_delete_ms);
    }
  };
}

/**
 * Create an action that sends a message with text resolved at runtime
 */
export function notify_dynamic(
  text_fn: (chat_id: number) => string | Promise<string>,
  options?: {
    parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
    auto_delete_ms?: number;
  }
): Action {
  return async (context) => {
    const text = await text_fn(context.chat_id);
    const msg = await context.bot.send_message(context.chat_id, text, {
      parse_mode: options?.parse_mode,
    });

    if (options?.auto_delete_ms) {
      setTimeout(async () => {
        await context.bot.delete_message(context.chat_id, msg.message_id);
      }, options.auto_delete_ms);
    }
  };
}