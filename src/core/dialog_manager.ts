import type { UserState, MessageType } from "../types/internal.js";
import { DEFAULT_USER_STATE } from "../types/internal.js";
import { deep_copy } from "../utils/deep_copy.js";

export class DialogManager {
  private readonly states: Map<number, UserState> = new Map();
  private readonly start_dialog: string;

  constructor(start_dialog: string) {
    this.start_dialog = start_dialog;
  }

  /**
   * Get user state, creating default if doesn't exist
   */
  get_state(chat_id: number): UserState {
    let state = this.states.get(chat_id);

    if (!state) {
      state = {
        ...deep_copy(DEFAULT_USER_STATE),
        current_dialog_id: this.start_dialog,
      };
      this.states.set(chat_id, state);
    }

    return state;
  }

  /**
   * Check if user has existing state
   */
  has_state(chat_id: number): boolean {
    return this.states.has(chat_id);
  }

  /**
   * Update user's current dialog
   */
  set_dialog(chat_id: number, dialog_id: string): void {
    const state = this.get_state(chat_id);
    state.current_dialog_id = dialog_id;
    state.last_activity = Date.now();
  }

  /**
   * Update last bot message info
   */
  set_last_message(chat_id: number, message_id: number, message_type: MessageType): void {
    const state = this.get_state(chat_id);
    state.last_bot_message_id = message_id;
    state.last_message_type = message_type;
    state.last_activity = Date.now();
  }

  /**
   * Set input waiting state
   */
  set_waiting(chat_id: number, wait_id: string, input_types: string[]): void {
    const state = this.get_state(chat_id);
    state.waiting_for_input = true;
    state.input_wait_id = wait_id;
    state.input_wait_types = input_types;
    state.last_activity = Date.now();
  }

  /**
   * Clear input waiting state
   */
  clear_waiting(chat_id: number): void {
    const state = this.get_state(chat_id);
    state.waiting_for_input = false;
    state.input_wait_id = "";
    state.input_wait_types = [];
  }

  /**
   * Check if user is waiting for input
   */
  is_waiting(chat_id: number): boolean {
    return this.get_state(chat_id).waiting_for_input;
  }

  /**
   * Get current wait ID
   */
  get_wait_id(chat_id: number): string {
    return this.get_state(chat_id).input_wait_id;
  }

  /**
   * Set reply keyboard active state
   */
  set_reply_keyboard_active(chat_id: number, active: boolean): void {
    const state = this.get_state(chat_id);
    state.reply_keyboard_active = active;
  }

  /**
   * Set custom user data
   */
  set_custom_data(chat_id: number, key: string, value: unknown): void {
    const state = this.get_state(chat_id);
    state.custom_data[key] = value;
    state.last_activity = Date.now();
  }

  /**
   * Get custom user data
   */
  get_custom_data<T>(chat_id: number, key: string): T | undefined {
    const state = this.get_state(chat_id);
    return state.custom_data[key] as T | undefined;
  }

  /**
   * Delete custom user data
   */
  delete_custom_data(chat_id: number, key: string): boolean {
    const state = this.get_state(chat_id);
    if (key in state.custom_data) {
      delete state.custom_data[key];
      return true;
    }
    return false;
  }

  /**
   * Reset user to start dialog
   */
  reset(chat_id: number): void {
    this.states.set(chat_id, {
      ...deep_copy(DEFAULT_USER_STATE),
      current_dialog_id: this.start_dialog,
    });
  }

  /**
   * Remove user state entirely
   */
  remove(chat_id: number): boolean {
    return this.states.delete(chat_id);
  }

  /**
   * Get all chat IDs with state
   */
  get_all_chat_ids(): number[] {
    return Array.from(this.states.keys());
  }

  /**
   * Clean up inactive users (for memory management)
   */
  cleanup_inactive(max_age_ms: number): number {
    const now = Date.now();
    let removed = 0;

    for (const [chat_id, state] of this.states) {
      if (now - state.last_activity > max_age_ms) {
        this.states.delete(chat_id);
        removed++;
      }
    }

    return removed;
  }
}