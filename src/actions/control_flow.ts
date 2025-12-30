import type { Action, ActionContext } from "../types/action.js";

/**
 * Execute multiple actions in sequence
 */
export function sequence(...actions: Action[]): Action {
  return async (context) => {
    for (const action of actions) {
      await action(context);
    }
  };
}

/**
 * Execute action conditionally
 */
export function when(
  condition: (context: ActionContext) => boolean | Promise<boolean>,
  then_action: Action,
  else_action?: Action
): Action {
  return async (context) => {
    const result = await condition(context);

    if (result) {
      await then_action(context);
    } else if (else_action) {
      await else_action(context);
    }
  };
}

/**
 * Execute action with delay
 */
export function delay(ms: number, action: Action): Action {
  return async (context) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await action(context);
  };
}

/**
 * Execute action only if user data matches
 */
export function when_data<T>(
  key: string,
  predicate: (value: T | undefined) => boolean,
  then_action: Action,
  else_action?: Action
): Action {
  return when(
    (context) => {
      const value = context.bot.get_user_data<T>(context.chat_id, key);
      return predicate(value);
    },
    then_action,
    else_action
  );
}

/**
 * Set user data
 */
export function set_data(key: string, value: unknown | ((chat_id: number) => unknown)): Action {
  return (context) => {
    const resolved = typeof value === "function" ? value(context.chat_id) : value;
    context.bot.set_user_data(context.chat_id, key, resolved);
  };
}

/**
 * Delete user data
 */
export function delete_data(key: string): Action {
  return (context) => {
    const state = context.bot.get_user_state(context.chat_id);
    delete state.custom_data[key];
  };
}