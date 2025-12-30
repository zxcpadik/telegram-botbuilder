import type { Action, WaitForInputOptions, CallbackFunction } from "../types/action.js";

/**
 * Create an action that waits for text input and calls handler with result
 */
export function wait_for_text(
  handler: CallbackFunction | string,
  options?: WaitForInputOptions
): Action {
  return async (context) => {
    const result = await context.bot.wait_for_text(context.chat_id, options);

    if (result.success && result.value !== undefined) {
      if (typeof handler === "string") {
        context.bot.events.emit(handler, context.chat_id, result.value);
      } else {
        await handler(context.chat_id, result.value);
      }
    } else if (result.cancelled && typeof handler === "string") {
      context.bot.events.emit(`${handler}_cancelled`, context.chat_id);
    } else if (result.timed_out && typeof handler === "string") {
      context.bot.events.emit(`${handler}_timeout`, context.chat_id);
    }
  };
}

/**
 * Create an action that waits for file upload and calls handler with result
 */
export function wait_for_file(
  handler: CallbackFunction | string,
  options?: WaitForInputOptions
): Action {
  return async (context) => {
    const result = await context.bot.wait_for_file(context.chat_id, options);

    if (result.success) {
      if (typeof handler === "string") {
        context.bot.events.emit(handler, context.chat_id, result);
      } else {
        await handler(context.chat_id, result);
      }
    } else if (result.cancelled && typeof handler === "string") {
      context.bot.events.emit(`${handler}_cancelled`, context.chat_id);
    } else if (result.timed_out && typeof handler === "string") {
      context.bot.events.emit(`${handler}_timeout`, context.chat_id);
    }
  };
}

/**
 * Create an action that waits for photo upload
 */
export function wait_for_photo(
  handler: CallbackFunction | string,
  options?: WaitForInputOptions
): Action {
  return wait_for_file(handler, {
    ...options,
    input_types: ["photo"],
  });
}