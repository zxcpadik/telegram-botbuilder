import type TelegramBot from "node-telegram-bot-api";
import type { InlineButton, ReplyButton, ReplyKeyboardOptions } from "../types/keyboard.js";
import type { ButtonRegistry } from "./button_registry.js";
import { resolve_inline_button, resolve_reply_button } from "../utils/resolvers.js";
import { PollType } from "node-telegram-bot-api";

export interface BuiltInlineKeyboard {
  inline_keyboard: TelegramBot.InlineKeyboardButton[][];
}

export interface BuiltReplyKeyboard {
  keyboard: TelegramBot.KeyboardButton[][];
  resize_keyboard: boolean;
  one_time_keyboard: boolean;
  input_field_placeholder?: string;
  selective: boolean;
  is_persistent: boolean;
}

export interface RemoveKeyboard {
  remove_keyboard: true;
  selective?: boolean;
}

export class KeyboardBuilder {
  private readonly registry: ButtonRegistry;

  constructor(registry: ButtonRegistry) {
    this.registry = registry;
  }

  /**
   * Build inline keyboard from button definitions
   */
  async build_inline(
    dialog_id: string,
    buttons: InlineButton[][],
    chat_id: number
  ): Promise<BuiltInlineKeyboard> {
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [];
    let button_index = 0;

    for (const row of buttons) {
      const keyboard_row: TelegramBot.InlineKeyboardButton[] = [];

      for (const button of row) {
        const resolved = await resolve_inline_button(button, chat_id);
        const hash = this.registry.register_inline(dialog_id, button, button_index);

        const kb_button: TelegramBot.InlineKeyboardButton = {
          text: resolved.text,
        };

        if (resolved.url) {
          kb_button.url = resolved.url;
        } else if (resolved.web_app) {
          kb_button.web_app = { url: resolved.web_app };
        } else {
          kb_button.callback_data = hash;
        }

        keyboard_row.push(kb_button);
        button_index++;
      }

      if (keyboard_row.length > 0) {
        keyboard.push(keyboard_row);
      }
    }

    return { inline_keyboard: keyboard };
  }

  /**
   * Build reply keyboard from button definitions
   */
  async build_reply(
    dialog_id: string,
    buttons: ReplyButton[][],
    chat_id: number,
    options?: ReplyKeyboardOptions
  ): Promise<BuiltReplyKeyboard> {
    const keyboard: TelegramBot.KeyboardButton[][] = [];

    for (const row of buttons) {
      const keyboard_row: TelegramBot.KeyboardButton[] = [];

      for (const button of row) {
        const resolved = await resolve_reply_button(button, chat_id);

        // Register for action lookup
        this.registry.register_reply(dialog_id, button, resolved.text);

        const kb_button: TelegramBot.KeyboardButton = {
          text: resolved.text,
        };

        if (button.request_contact) {
          kb_button.request_contact = true;
        }

        if (button.request_location) {
          kb_button.request_location = true;
        }

        if (button.request_poll) {
          kb_button.request_poll = { type: button.request_poll.type as PollType };
        }

        keyboard_row.push(kb_button);
      }

      if (keyboard_row.length > 0) {
        keyboard.push(keyboard_row);
      }
    }

    return {
      keyboard,
      resize_keyboard: options?.resize_keyboard ?? true,
      one_time_keyboard: options?.one_time_keyboard ?? false,
      input_field_placeholder: options?.input_field_placeholder,
      selective: options?.selective ?? false,
      is_persistent: options?.is_persistent ?? false,
    };
  }

  /**
   * Create remove keyboard markup
   */
  build_remove(selective?: boolean): RemoveKeyboard {
    return {
      remove_keyboard: true,
      selective,
    };
  }
}