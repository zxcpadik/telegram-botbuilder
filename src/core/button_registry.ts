import type { InlineButton, ReplyButton } from "../types/keyboard.js";
import type { RegisteredInlineButton, RegisteredReplyButton } from "../types/internal.js";
import { hash_button, HashableButton } from "../utils/hash.js";
import { deep_copy } from "../utils/deep_copy.js";

export class ButtonRegistry {
  private readonly inline_buttons: Map<string, RegisteredInlineButton> = new Map();
  private readonly reply_buttons: Map<string, RegisteredReplyButton[]> = new Map();

  /**
   * Register an inline button and return its hash
   */
  register_inline(dialog_id: string, button: InlineButton, index: number): string {
    const hash = hash_button(dialog_id, button as HashableButton, index);

    this.inline_buttons.set(hash, {
      hash,
      dialog_id,
      button: deep_copy(button),
    });

    return hash;
  }

  /**
   * Get an inline button by its hash
   */
  get_inline(hash: string): RegisteredInlineButton | undefined {
    return this.inline_buttons.get(hash);
  }

  /**
   * Register a reply button (multiple buttons can have same text)
   */
  register_reply(dialog_id: string, button: ReplyButton, resolved_text: string): void {
    const registered: RegisteredReplyButton = {
      text: resolved_text,
      dialog_id,
      button: deep_copy(button),
    };

    const existing = this.reply_buttons.get(resolved_text);
    if (existing) {
      // Check if already registered for this dialog
      const already_exists = existing.some((b) => b.dialog_id === dialog_id);
      if (!already_exists) {
        existing.push(registered);
      }
    } else {
      this.reply_buttons.set(resolved_text, [registered]);
    }
  }

  /**
   * Find reply buttons matching text, optionally filtered by dialog
   */
  find_reply(text: string, dialog_id?: string): RegisteredReplyButton[] {
    const buttons = this.reply_buttons.get(text);

    if (!buttons) {
      return [];
    }

    if (dialog_id) {
      return buttons.filter((b) => b.dialog_id === dialog_id);
    }

    return buttons;
  }

  /**
   * Check if an inline button hash exists
   */
  has_inline(hash: string): boolean {
    return this.inline_buttons.has(hash);
  }

  /**
   * Clear all registered buttons
   */
  clear(): void {
    this.inline_buttons.clear();
    this.reply_buttons.clear();
  }

  /**
   * Get count of registered inline buttons
   */
  get inline_count(): number {
    return this.inline_buttons.size;
  }

  /**
   * Get count of registered reply button texts
   */
  get reply_count(): number {
    return this.reply_buttons.size;
  }
}