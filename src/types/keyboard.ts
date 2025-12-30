import type { Action, TextSource } from "./dialog.js";

export interface InlineButton {
  /** Button label */
  text: TextSource;

  /** Action(s) to execute on click */
  action?: Action | Action[];

  /** URL to open (mutually exclusive with action) */
  url?: TextSource;

  /** Mini app / Web app URL */
  web_app?: TextSource;

  /** Callback data override (auto-generated if not set) */
  callback_data?: string;
}

export interface ReplyButton {
  /** Button label */
  text: TextSource;

  /** Action(s) to execute when this text is received */
  action?: Action | Action[];

  /** Request contact from user */
  request_contact?: boolean;

  /** Request location from user */
  request_location?: boolean;

  /** Request poll from user */
  request_poll?: { type?: "quiz" | "regular" };
}

export interface ReplyKeyboardOptions {
  /** Resize keyboard to fit buttons (default: true) */
  resize_keyboard?: boolean;

  /** Hide keyboard after button press (default: false) */
  one_time_keyboard?: boolean;

  /** Placeholder text in input field */
  input_field_placeholder?: string;

  /** Show only to specific users in groups (default: false) */
  selective?: boolean;

  /** Keep keyboard persistent (default: false) */
  is_persistent?: boolean;
}

export type ButtonSource<T> = T[][] | ((chat_id: number) => T[][] | Promise<T[][]>);