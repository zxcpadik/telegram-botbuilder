import type { Dialog, InlineButton, ReplyButton } from "./dialog.js";

export type MessageType = "text" | "photo" | "media_group";

export interface UserState {
  /** Current dialog ID */
  current_dialog_id: string;

  /** Last bot message ID (for editing) */
  last_bot_message_id: number;

  /** Type of last message sent */
  last_message_type: MessageType;

  /** Whether bot is waiting for user input */
  waiting_for_input: boolean;

  /** Unique ID for current input wait */
  input_wait_id: string;

  /** Types of input being waited for */
  input_wait_types: string[];

  /** Whether reply keyboard is currently shown */
  reply_keyboard_active: boolean;

  /** Custom user data storage */
  custom_data: Record<string, unknown>;

  /** Last activity timestamp */
  last_activity: number;
}

export interface RegisteredInlineButton {
  hash: string;
  dialog_id: string;
  button: InlineButton;
}

export interface RegisteredReplyButton {
  text: string;
  dialog_id: string;
  button: ReplyButton;
}

export interface InternalDialog extends Dialog {
  _compiled_inline_buttons?: RegisteredInlineButton[][];
  _compiled_reply_buttons?: RegisteredReplyButton[][];
}

export interface InternalSchema {
  start_dialog: string;
  dialogs: Map<string, InternalDialog>;
  commands: Map<string, import("./dialog.js").Command>;
  inline_buttons: Map<string, RegisteredInlineButton>;
  reply_buttons: Map<string, RegisteredReplyButton[]>;
  error_dialog?: string;
  fallback_action?: import("./action.js").Action;
  reply_fallback_action?: import("./action.js").Action;
}

export interface PendingInput {
  wait_id: string;
  chat_id: number;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timeout_handle?: ReturnType<typeof setTimeout>;
  input_types: string[];
  validator?: (input: string) => boolean | string | Promise<boolean | string>;
  cancel_keywords: string[];
}

export const DEFAULT_USER_STATE: Omit<UserState, "current_dialog_id"> = {
  last_bot_message_id: -1,
  last_message_type: "text",
  waiting_for_input: false,
  input_wait_id: "",
  input_wait_types: [],
  reply_keyboard_active: false,
  custom_data: {},
  last_activity: Date.now(),
};