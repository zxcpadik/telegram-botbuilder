import { BotError } from "./bot_error.js";

export class DialogError extends BotError {
  public readonly dialog_id?: string;

  constructor(
    message: string,
    dialog_id?: string,
    chat_id?: number,
    details?: Record<string, unknown>
  ) {
    super(message, "DIALOG_ERROR", chat_id, details);
    this.name = "DialogError";
    this.dialog_id = dialog_id;
  }
}

export class DialogNotFoundError extends DialogError {
  constructor(dialog_id: string, chat_id?: number) {
    super(`Dialog not found: "${dialog_id}"`, dialog_id, chat_id);
    this.name = "DialogNotFoundError";
  }
}

export class InvalidDialogError extends DialogError {
  constructor(dialog_id: string, reason: string) {
    super(`Invalid dialog "${dialog_id}": ${reason}`, dialog_id);
    this.name = "InvalidDialogError";
  }
}