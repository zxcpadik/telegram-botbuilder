import type { WaitForInputOptions, WaitResult, FileWaitResult } from "../types/action.js";
import type { PendingInput } from "../types/internal.js";
import type { Logger } from "../utils/logger.js";
import { generate_wait_id } from "../utils/hash.js";
import { ERROR_MESSAGES, DEFAULTS } from "../utils/constants.js";

export class InputManager {
  private readonly pending: Map<string, PendingInput> = new Map();
  private readonly logger: Logger;
  private readonly default_timeout: number;

  constructor(logger: Logger, default_timeout: number = DEFAULTS.INPUT_TIMEOUT_MS) {
    this.logger = logger;
    this.default_timeout = default_timeout;
  }

  /**
   * Create a new input wait
   */
  create_wait<T = string>(
    chat_id: number,
    input_types: string[],
    options?: WaitForInputOptions
  ): { wait_id: string; promise: Promise<WaitResult<T>> } {
    const wait_id = generate_wait_id();
    const timeout = options?.timeout ?? this.default_timeout;
    const cancel_keywords = options?.cancel_keywords ?? DEFAULTS.CANCEL_KEYWORDS;

    const promise = new Promise<WaitResult<T>>((resolve, reject) => {
      const pending: PendingInput = {
        wait_id,
        chat_id,
        resolve: resolve as (result: unknown) => void,
        reject,
        input_types,
        validator: options?.validator,
        cancel_keywords: cancel_keywords as any,
      };

      // Set timeout
      if (timeout > 0) {
        pending.timeout_handle = setTimeout(() => {
          this.resolve_wait(wait_id, {
            success: false,
            timed_out: true,
            error: options?.timeout_message ?? ERROR_MESSAGES.INPUT_TIMEOUT,
          });
        }, timeout);
      }

      this.pending.set(wait_id, pending);
      this.logger.debug(`Created input wait ${wait_id} for chat ${chat_id}`);
    });

    return { wait_id, promise };
  }

  /**
   * Check if there's a pending wait for a chat
   */
  get_pending(chat_id: number, wait_id: string): PendingInput | undefined {
    const pending = this.pending.get(wait_id);
    if (pending && pending.chat_id === chat_id) {
      return pending;
    }
    return undefined;
  }

  /**
   * Resolve a wait with a result
   */
  resolve_wait<T = string>(wait_id: string, result: WaitResult<T> | FileWaitResult): void {
    const pending = this.pending.get(wait_id);

    if (!pending) {
      this.logger.debug(`Attempted to resolve unknown wait ${wait_id}`);
      return;
    }

    // Clear timeout
    if (pending.timeout_handle) {
      clearTimeout(pending.timeout_handle);
    }

    // Remove from pending
    this.pending.delete(wait_id);

    // Resolve the promise
    pending.resolve(result);
    this.logger.debug(`Resolved wait ${wait_id}`);
  }

  /**
   * Cancel a wait
   */
  cancel_wait(wait_id: string, message?: string): void {
    this.resolve_wait(wait_id, {
      success: false,
      cancelled: true,
      error: message ?? ERROR_MESSAGES.INPUT_CANCELLED,
    });
  }

  /**
   * Cancel all pending waits for a chat
   */
  cancel_all_for_chat(chat_id: number): number {
    let cancelled = 0;

    for (const [wait_id, pending] of this.pending) {
      if (pending.chat_id === chat_id) {
        this.cancel_wait(wait_id);
        cancelled++;
      }
    }

    return cancelled;
  }

  /**
   * Check if input matches cancel keywords
   */
  is_cancel_input(text: string, wait_id: string): boolean {
    const pending = this.pending.get(wait_id);
    if (!pending) return false;

    return pending.cancel_keywords.some(
      (keyword) => text.toLowerCase().trim() === keyword.toLowerCase()
    );
  }

  /**
   * Validate input using the pending wait's validator
   */
  async validate_input(wait_id: string, input: string): Promise<boolean | string> {
    const pending = this.pending.get(wait_id);

    if (!pending?.validator) {
      return true;
    }

    return await pending.validator(input);
  }

  /**
   * Get count of pending waits
   */
  get pending_count(): number {
    return this.pending.size;
  }

  /**
   * Clear all pending waits
   */
  clear_all(): void {
    for (const [wait_id] of this.pending) {
      this.cancel_wait(wait_id, "Bot stopped");
    }
  }
}