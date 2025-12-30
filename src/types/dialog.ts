import type { Action, DialogAction } from "./action.js";
import type { InlineButton, ReplyButton, ButtonSource, ReplyKeyboardOptions } from "./keyboard.js";

export type TextSource = string | ((chat_id: number) => string | Promise<string>);

export type ImageSource =
  | string
  | string[]
  | ((chat_id: number) => string | string[] | undefined | Promise<string | string[] | undefined>);

export interface Dialog {
  /** Unique dialog identifier */
  id: string;

  /** Dialog text content (supports HTML by default) */
  text?: TextSource;

  /** Inline keyboard buttons (under the message) */
  inline_buttons?: ButtonSource<InlineButton>;

  /** Reply keyboard buttons (main keyboard) */
  reply_buttons?: ButtonSource<ReplyButton>;

  /** Reply keyboard options */
  reply_keyboard_options?: ReplyKeyboardOptions;

  /** Remove reply keyboard when entering this dialog */
  remove_reply_keyboard?: boolean;

  /** Images/photos to display */
  images?: ImageSource;

  /** Called when user enters this dialog */
  on_enter?: DialogAction;

  /** Called when user leaves this dialog */
  on_leave?: DialogAction;

  /** Disable web page preview for links (default: false) */
  disable_web_page_preview?: boolean;

  /** Protect content from forwarding/saving (default: false) */
  protect_content?: boolean;
}

export interface Command {
  /** Command name without slash (e.g., "help", "settings") */
  name: string;

  /** Command description for BotFather */
  description?: string;

  /** Action(s) to execute */
  action?: Action | Action[];
}

// Re-export for convenience
export type { InlineButton, ReplyButton, ButtonSource, ReplyKeyboardOptions } from "./keyboard.js";
export type { Action, DialogAction, ActionContext, DialogActionContext } from "./action.js";