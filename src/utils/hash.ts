import { createHash } from "node:crypto";

export interface HashableButton {
  text?: string | ((...args: unknown[]) => unknown);
  action?: unknown;
  url?: string | ((...args: unknown[]) => unknown);
  web_app?: string | ((...args: unknown[]) => unknown);
  callback_data?: string;
}

/**
 * Generate a deterministic hash for a button based on its properties.
 * Used for matching callback_data to buttons.
 */
export function hash_button(dialog_id: string, button: HashableButton, index?: number): string {
  // If callback_data is explicitly set, use it
  if (button.callback_data) {
    return button.callback_data;
  }

  const hash_input: Record<string, unknown> = {
    dialog_id,
  };

  // Include text if it's a string
  if (typeof button.text === "string") {
    hash_input.text = button.text;
  }

  // Include url if it's a string
  if (typeof button.url === "string") {
    hash_input.url = button.url;
  }

  // Include web_app if it's a string
  if (typeof button.web_app === "string") {
    hash_input.web_app = button.web_app;
  }

  // Include index for uniqueness when other properties are dynamic
  if (index !== undefined) {
    hash_input.index = index;
  }

  // Include action reference for uniqueness
  if (button.action) {
    if (typeof button.action === "function") {
      hash_input.action_name = button.action.name || "anonymous";
    } else if (Array.isArray(button.action)) {
      hash_input.action_count = button.action.length;
    }
  }

  const json = JSON.stringify(hash_input, Object.keys(hash_input).sort());
  const hash = createHash("sha256").update(json).digest("hex");

  // Return first 16 chars - enough for uniqueness, fits callback_data limit
  return hash.substring(0, 16);
}

/**
 * Generate a unique ID for input waiting
 */
export function generate_wait_id(): string {
  return crypto.randomUUID();
}