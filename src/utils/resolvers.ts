import type { TextSource, ImageSource, ButtonSource } from "../types/dialog.js";
import type { InlineButton, ReplyButton } from "../types/keyboard.js";
import { is_text_source_function, is_button_source_function, is_image_source_function } from "./type_guards.js";

/**
 * Resolve a TextSource to a string value
 */
export async function resolve_text(source: TextSource | undefined, chat_id: number): Promise<string | undefined> {
  if (source === undefined) {
    return undefined;
  }

  if (is_text_source_function(source)) {
    return await source(chat_id);
  }

  return source;
}

/**
 * Resolve an ImageSource to string or string[]
 */
export async function resolve_images(
  source: ImageSource | undefined,
  chat_id: number
): Promise<string | string[] | undefined> {
  if (source === undefined) {
    return undefined;
  }

  if (is_image_source_function(source)) {
    return await source(chat_id);
  }

  return source;
}

/**
 * Resolve ButtonSource to a 2D array of buttons
 */
export async function resolve_buttons<T extends InlineButton | ReplyButton>(
  source: ButtonSource<T> | undefined,
  chat_id: number
): Promise<T[][] | undefined> {
  if (source === undefined) {
    return undefined;
  }

  if (is_button_source_function<T>(source)) {
    return await source(chat_id);
  }

  return source;
}

/**
 * Resolve all dynamic properties of an InlineButton
 */
export async function resolve_inline_button(
  button: InlineButton,
  chat_id: number
): Promise<{ text: string; url?: string; web_app?: string }> {
  const text = await resolve_text(button.text, chat_id);
  const url = await resolve_text(button.url, chat_id);
  const web_app = await resolve_text(button.web_app, chat_id);

  return {
    text: text ?? "",
    url,
    web_app,
  };
}

/**
 * Resolve all dynamic properties of a ReplyButton
 */
export async function resolve_reply_button(
  button: ReplyButton,
  chat_id: number
): Promise<{ text: string }> {
  const text = await resolve_text(button.text, chat_id);

  return {
    text: text ?? "",
  };
}