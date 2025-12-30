import type TelegramBot from "node-telegram-bot-api";

export function is_message(update: unknown): update is TelegramBot.Message {
  return (
    typeof update === "object" &&
    update !== null &&
    "chat" in update &&
    "message_id" in update
  );
}

export function is_callback_query(update: unknown): update is TelegramBot.CallbackQuery {
  return (
    typeof update === "object" &&
    update !== null &&
    "id" in update &&
    "from" in update &&
    !("chat" in update && "message_id" in update && !("message" in update))
  );
}

export function has_text(message: TelegramBot.Message): message is TelegramBot.Message & { text: string } {
  return typeof message.text === "string";
}

export function has_document(message: TelegramBot.Message): message is TelegramBot.Message & { document: TelegramBot.Document } {
  return message.document !== undefined;
}

export function has_photo(message: TelegramBot.Message): message is TelegramBot.Message & { photo: TelegramBot.PhotoSize[] } {
  return Array.isArray(message.photo) && message.photo.length > 0;
}

export function has_contact(message: TelegramBot.Message): message is TelegramBot.Message & { contact: TelegramBot.Contact } {
  return message.contact !== undefined;
}

export function has_location(message: TelegramBot.Message): message is TelegramBot.Message & { location: TelegramBot.Location } {
  return message.location !== undefined;
}

export function is_text_source_function(
  source: unknown
): source is (chat_id: number) => string | Promise<string> {
  return typeof source === "function";
}

export function is_button_source_function<T>(
  source: unknown
): source is (chat_id: number) => T[][] | Promise<T[][]> {
  return typeof source === "function";
}

export function is_image_source_function(
  source: unknown
): source is (chat_id: number) => string | string[] | undefined | Promise<string | string[] | undefined> {
  return typeof source === "function";
}