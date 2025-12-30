import type { Action, CallbackFunction } from "../types/action.js";

/**
 * Create an action that emits an event
 */
export function emit(event_name: string, ...args: unknown[]): Action {
  return (context) => {
    context.bot.events.emit(event_name, context.chat_id, ...args);
  };
}

/**
 * Create an action that calls a function directly
 */
export function call(fn: CallbackFunction, ...args: unknown[]): Action {
  return async (context) => {
    await fn(context.chat_id, ...args);
  };
}

/**
 * Create an action that calls a function with the full context
 */
export function call_with_context(fn: (context: import("../types/action.js").ActionContext) => void | Promise<void>): Action {
  return async (context) => {
    await fn(context);
  };
}