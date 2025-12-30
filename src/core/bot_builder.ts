import TelegramBot, { type InputMediaPhoto } from "node-telegram-bot-api";
import { EventEmitter } from "node:events";

import type { Schema } from "../types/schema.js";
import type { BotConfig, LoggerConfig } from "../types/config.js";
import type { Action, ActionContext, WaitForInputOptions, WaitResult, FileWaitResult } from "../types/action.js";
import type { Dialog, InlineButton, ReplyButton } from "../types/dialog.js";
import type { Middleware, MiddlewareContext, UpdateType } from "../types/middleware.js";
import type { UserState, InternalSchema } from "../types/internal.js";

import { DEFAULT_CONFIG } from "../types/config.js";
import { Logger } from "../utils/logger.js";
import { resolve_text, resolve_images, resolve_buttons } from "../utils/resolvers.js";
import { has_text, has_document, has_photo, has_contact, has_location } from "../utils/type_guards.js";

import { DialogManager } from "./dialog_manager.js";
import { ButtonRegistry } from "./button_registry.js";
import { KeyboardBuilder } from "./keyboard_builder.js";
import { MiddlewareChain } from "./middleware_chain.js";
import { InputManager } from "./input_manager.js";
import { SchemaCompiler } from "./schema_compiler.js";

import { TelegramError } from "../errors/telegram_error.js";
import { DialogNotFoundError } from "../errors/dialog_error.js";
import { readFile, unlink } from "node:fs/promises";

export class BotBuilder {
  /** Raw telegram bot instance (for advanced usage) */
  public readonly telegram: TelegramBot;

  /** Event emitter for custom events */
  public readonly events: EventEmitter;

  private readonly config: Required<Omit<BotConfig, "telegram_options">> & { logger: Required<LoggerConfig> };
  private readonly logger: Logger;
  private readonly schema: InternalSchema;
  private readonly dialog_manager: DialogManager;
  private readonly button_registry: ButtonRegistry;
  private readonly keyboard_builder: KeyboardBuilder;
  private readonly middleware_chain: MiddlewareChain;
  private readonly input_manager: InputManager;

  constructor(schema: Schema, config: BotConfig) {
    // Merge config with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      logger: {
        ...DEFAULT_CONFIG.logger,
        ...config.logger,
      },
    };

    // Initialize logger
    this.logger = new Logger(this.config.logger);
    this.logger.info("Initializing BotBuilder...");

    // Compile schema
    const compiler = new SchemaCompiler(this.logger);
    this.schema = compiler.compile(schema, this.config.validate_schema);

    // Initialize components
    this.dialog_manager = new DialogManager(this.schema.start_dialog);
    this.button_registry = new ButtonRegistry();
    this.keyboard_builder = new KeyboardBuilder(this.button_registry);
    this.middleware_chain = new MiddlewareChain(this.logger);
    this.input_manager = new InputManager(this.logger, this.config.default_input_timeout);
    this.events = new EventEmitter();

    // Initialize Telegram bot
    this.telegram = new TelegramBot(config.token, config.telegram_options);

    // Set up handlers
    this.setup_handlers();

    this.logger.info("BotBuilder initialized successfully");
  }

  // ==================== PUBLIC API ====================

  /**
   * Add middleware to the processing chain
   */
  use(middleware: Middleware): this {
    this.middleware_chain.use(middleware);
    return this;
  }

  /**
   * Navigate user to a specific dialog
   */
  async change_dialog(chat_id: number, dialog_id: string): Promise<void> {
    const dialog = this.schema.dialogs.get(dialog_id);

    if (!dialog) {
      throw new DialogNotFoundError(dialog_id, chat_id);
    }

    const state = this.dialog_manager.get_state(chat_id);
    const previous_dialog_id = state.current_dialog_id;

    // Cancel any pending input
    if (state.waiting_for_input) {
      this.input_manager.cancel_wait(state.input_wait_id);
      this.dialog_manager.clear_waiting(chat_id);
    }

    // Call on_leave for previous dialog
    const previous_dialog = this.schema.dialogs.get(previous_dialog_id);
    if (previous_dialog?.on_leave) {
      await previous_dialog.on_leave({
        chat_id,
        bot: this,
        other_dialog_id: dialog_id,
      });
    }

    // Update state
    this.dialog_manager.set_dialog(chat_id, dialog_id);

    // Call on_enter for new dialog
    if (dialog.on_enter) {
      await dialog.on_enter({
        chat_id,
        bot: this,
        other_dialog_id: previous_dialog_id,
      });
    }

    // Render the dialog
    await this.render_dialog(chat_id, dialog);
  }

  /**
   * Send a standalone message (not part of dialog system)
   */
  async send_message(
    chat_id: number,
    text: string,
    options?: {
      parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
      disable_web_page_preview?: boolean;
      disable_notification?: boolean;
      protect_content?: boolean;
    }
  ): Promise<TelegramBot.Message> {
    return this.telegram.sendMessage(chat_id, text, {
      parse_mode: options?.parse_mode ?? this.config.default_parse_mode,
      disable_web_page_preview: options?.disable_web_page_preview,
      disable_notification: options?.disable_notification,
      protect_content: options?.protect_content,
    });
  }

  /**
   * Get current user state
   */
  get_user_state(chat_id: number): UserState {
    return this.dialog_manager.get_state(chat_id);
  }

  /**
   * Set custom data in user state
   */
  set_user_data(chat_id: number, key: string, value: unknown): void {
    this.dialog_manager.set_custom_data(chat_id, key, value);
  }

  /**
   * Get custom data from user state
   */
  get_user_data<T>(chat_id: number, key: string): T | undefined {
    return this.dialog_manager.get_custom_data<T>(chat_id, key);
  }

  /**
   * Reset user state to start dialog
   */
  async reset_user(chat_id: number): Promise<void> {
    this.dialog_manager.reset(chat_id);
    await this.change_dialog(chat_id, this.schema.start_dialog);
  }

  /**
   * Delete a message
   */
  async delete_message(chat_id: number, message_id: number): Promise<boolean> {
    try {
      await this.telegram.deleteMessage(chat_id, message_id);
      return true;
    } catch (error) {
      const tg_error = TelegramError.from_error(error, chat_id);
      if (tg_error.is_message_not_found()) {
        return false;
      }
      throw tg_error;
    }
  }

  /**
   * Get a dialog by ID
   */
  get_dialog(dialog_id: string): Dialog | undefined {
    return this.schema.dialogs.get(dialog_id);
  }

  /**
   * Wait for user text input
   */
  async wait_for_text(
    chat_id: number,
    options?: WaitForInputOptions
  ): Promise<WaitResult<string>> {
    const { wait_id, promise } = this.input_manager.create_wait<string>(
      chat_id,
      ["text"],
      options
    );

    this.dialog_manager.set_waiting(chat_id, wait_id, ["text"]);

    return promise;
  }

  /**
   * Wait for user file upload
   */
  async wait_for_file(
    chat_id: number,
    options?: WaitForInputOptions
  ): Promise<FileWaitResult> {
    const input_types = options?.input_types ?? ["document"];
    const { wait_id, promise } = this.input_manager.create_wait<FileWaitResult>(
      chat_id,
      input_types,
      options
    );

    this.dialog_manager.set_waiting(chat_id, wait_id, input_types);

    return promise as Promise<FileWaitResult>;
  }

  /**
   * Graceful shutdown
   */
  async stop(): Promise<void> {
    this.logger.info("Stopping bot...");
    this.input_manager.clear_all();
    await this.telegram.stopPolling();
    this.logger.info("Bot stopped");
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Set up all message handlers
   */
  private setup_handlers(): void {
    // Handle /start command
    if (this.config.enable_start_command) {
      this.telegram.onText(/^\/start(?:\s+(.*))?$/, async (msg, match) => {
        await this.handle_start(msg, match?.[1]);
      });
    }

    // Handle other commands
    this.telegram.onText(/^\/(\w+)(?:\s+(.*))?$/, async (msg, match) => {
      if (match?.[1] === "start" && this.config.enable_start_command) {
        return; // Handled above
      }
      await this.handle_command(msg, match?.[1] ?? "", match?.[2]);
    });

    // Handle callback queries (inline button clicks)
    this.telegram.on("callback_query", async (query) => {
      await this.handle_callback(query);
    });

    // Handle regular messages
    this.telegram.on("message", async (msg) => {
      // Skip commands
      if (msg.text?.startsWith("/")) return;

      await this.handle_message(msg);
    });

    // Handle documents
    this.telegram.on("document", async (msg) => {
      await this.handle_document(msg);
    });

    // Handle photos
    this.telegram.on("photo", async (msg) => {
      await this.handle_photo(msg);
    });

    // Handle contact
    this.telegram.on("contact", async (msg) => {
      await this.handle_contact(msg);
    });

    // Handle location
    this.telegram.on("location", async (msg) => {
      await this.handle_location(msg);
    });
  }

  /**
   * Handle /start command
   */
  private async handle_start(msg: TelegramBot.Message, _args?: string): Promise<void> {
    const chat_id = msg.chat.id;

    const should_continue = await this.run_middleware(chat_id, msg, "command");
    if (!should_continue) return;

    // Delete the /start message
    if (this.config.auto_delete_user_messages) {
      await this.delete_message(chat_id, msg.message_id);
    }

    // Delete previous bot message if exists
    const state = this.dialog_manager.get_state(chat_id);
    if (state.last_bot_message_id !== -1) {
      await this.delete_message(chat_id, state.last_bot_message_id);
    }

    // Reset and go to start dialog
    this.dialog_manager.reset(chat_id);
    await this.change_dialog(chat_id, this.schema.start_dialog);
  }

  /**
   * Handle other commands
   */
  private async handle_command(msg: TelegramBot.Message, name: string, args?: string): Promise<void> {
    const chat_id = msg.chat.id;

    const should_continue = await this.run_middleware(chat_id, msg, "command");
    if (!should_continue) return;

    const command = this.schema.commands.get(name.toLowerCase());

    if (!command?.action) {
      this.logger.debug(`Unknown command: /${name}`);
      return;
    }

    const context: ActionContext = {
      chat_id,
      bot: this,
      message: msg,
      command_args: args,
    };

    await this.execute_action(command.action, context);
  }

  /**
   * Handle callback queries (inline button clicks)
   */
  private async handle_callback(query: TelegramBot.CallbackQuery): Promise<void> {
    const chat_id = query.message?.chat.id;
    if (!chat_id) return;

    // Answer callback to remove loading state
    await this.telegram.answerCallbackQuery(query.id);

    const should_continue = await this.run_middleware(chat_id, query, "callback_query");
    if (!should_continue) return;

    // Update last message ID
    if (query.message?.message_id) {
      const state = this.dialog_manager.get_state(chat_id);
      this.dialog_manager.set_last_message(
        chat_id,
        query.message.message_id,
        state.last_message_type
      );
    }

    const callback_data = query.data;
    if (!callback_data) return;

    // Find button
    const registered = this.button_registry.get_inline(callback_data);

    if (!registered) {
      this.logger.warn(`Unknown button callback: ${callback_data}`);
      // Navigate to start dialog as fallback
      await this.change_dialog(chat_id, this.schema.start_dialog);
      return;
    }

    if (registered.button.action) {
      const context: ActionContext = {
        chat_id,
        bot: this,
        callback_query: query,
      };

      await this.execute_action(registered.button.action, context);
    }
  }

  /**
   * Handle regular text messages
   */
  private async handle_message(msg: TelegramBot.Message): Promise<void> {
    const chat_id = msg.chat.id;

    const should_continue = await this.run_middleware(chat_id, msg, "message");
    if (!should_continue) return;

    const state = this.dialog_manager.get_state(chat_id);

    // Check if waiting for input
    if (state.waiting_for_input && has_text(msg)) {
      await this.handle_text_input(chat_id, msg);
      return;
    }

    // Check if it's a reply keyboard button
    if (has_text(msg)) {
      const handled = await this.handle_reply_button(chat_id, msg.text, msg);
      if (handled) return;
    }

    // Fallback action
    if (this.schema.fallback_action) {
      const context: ActionContext = {
        chat_id,
        bot: this,
        message: msg,
      };
      await this.execute_action(this.schema.fallback_action, context);
    }
  }

  /**
   * Handle text input when waiting
   */
  private async handle_text_input(chat_id: number, msg: TelegramBot.Message & { text: string }): Promise<void> {
    const state = this.dialog_manager.get_state(chat_id);
    const wait_id = state.input_wait_id;

    // Delete user message
    if (this.config.auto_delete_user_messages) {
      await this.delete_message(chat_id, msg.message_id);
    }

    // Check for cancel
    if (this.input_manager.is_cancel_input(msg.text, wait_id)) {
      this.input_manager.cancel_wait(wait_id);
      this.dialog_manager.clear_waiting(chat_id);
      return;
    }

    // Validate
    const validation = await this.input_manager.validate_input(wait_id, msg.text);
    if (validation !== true) {
      const error_msg = typeof validation === "string" ? validation : "Invalid input";
      await this.send_message(chat_id, error_msg);
      return; // Keep waiting
    }

    // Resolve
    this.input_manager.resolve_wait(wait_id, {
      success: true,
      value: msg.text,
    });
    this.dialog_manager.clear_waiting(chat_id);
  }

  /**
   * Handle reply keyboard button press
   */
  private async handle_reply_button(chat_id: number, text: string, msg: TelegramBot.Message): Promise<boolean> {
    const state = this.dialog_manager.get_state(chat_id);
    const buttons = this.button_registry.find_reply(text, state.current_dialog_id);

    if (buttons.length === 0) {
      // Try without dialog filter (global buttons)
      const global_buttons = this.button_registry.find_reply(text);
      if (global_buttons.length === 0) {
        return false;
      }

      // Use first matching global button
      const button = global_buttons[0];
      if (button!.button.action) {
        if (this.config.auto_delete_user_messages) {
          await this.delete_message(chat_id, msg.message_id);
        }

        const context: ActionContext = {
          chat_id,
          bot: this,
          message: msg,
        };
        await this.execute_action(button!.button.action, context);
        return true;
      }
      return false;
    }

    // Use first matching button for current dialog
    const button = buttons[0];
    if (button!.button.action) {
      if (this.config.auto_delete_user_messages) {
        await this.delete_message(chat_id, msg.message_id);
      }

      const context: ActionContext = {
        chat_id,
        bot: this,
        message: msg,
      };
      await this.execute_action(button!.button.action, context);
      return true;
    }

    return false;
  }

  /**
   * Handle document upload
   */
  private async handle_document(msg: TelegramBot.Message): Promise<void> {
    const chat_id = msg.chat.id;

    const should_continue = await this.run_middleware(chat_id, msg, "document");
    if (!should_continue) return;

    const state = this.dialog_manager.get_state(chat_id);

    if (!state.waiting_for_input || !state.input_wait_types.includes("document")) {
      return;
    }

    if (!has_document(msg)) return;

    // Delete user message
    if (this.config.auto_delete_user_messages) {
      await this.delete_message(chat_id, msg.message_id);
    }

    try {
      const file_path = await this.telegram.downloadFile(msg.document.file_id, "./");
      const content = await readFile(file_path, "utf8");
      await unlink(file_path);

      this.input_manager.resolve_wait<FileWaitResult>(state.input_wait_id, {
        success: true,
        file_id: msg.document.file_id,
        file_content: content,
        file_name: msg.document.file_name,
        mime_type: msg.document.mime_type,
      });
    } catch (error) {
      this.input_manager.resolve_wait<FileWaitResult>(state.input_wait_id, {
        success: false,
        error: (error as Error).message,
      });
    }

    this.dialog_manager.clear_waiting(chat_id);
  }

  /**
   * Handle photo upload
   */
  private async handle_photo(msg: TelegramBot.Message): Promise<void> {
    const chat_id = msg.chat.id;

    const should_continue = await this.run_middleware(chat_id, msg, "photo");
    if (!should_continue) return;

    const state = this.dialog_manager.get_state(chat_id);

    if (!state.waiting_for_input || !state.input_wait_types.includes("photo")) {
      return;
    }

    if (!has_photo(msg)) return;

    // Delete user message
    if (this.config.auto_delete_user_messages) {
      await this.delete_message(chat_id, msg.message_id);
    }

    // Get largest photo
    const photo = msg.photo[msg.photo.length - 1];

    this.input_manager.resolve_wait<FileWaitResult>(state.input_wait_id, {
      success: true,
      file_id: photo!.file_id,
    });
    this.dialog_manager.clear_waiting(chat_id);
  }

  /**
   * Handle contact share
   */
  private async handle_contact(msg: TelegramBot.Message): Promise<void> {
    const chat_id = msg.chat.id;

    const should_continue = await this.run_middleware(chat_id, msg, "contact");
    if (!should_continue) return;

    if (!has_contact(msg)) return;

    // Find reply button requesting contact
    // const state = this.dialog_manager.get_state(chat_id);
    // const dialog = this.schema.dialogs.get(state.current_dialog_id);

    // Emit event for handlers
    this.events.emit("contact", chat_id, msg.contact);
  }

  /**
   * Handle location share
   */
  private async handle_location(msg: TelegramBot.Message): Promise<void> {
    const chat_id = msg.chat.id;

    const should_continue = await this.run_middleware(chat_id, msg, "location");
    if (!should_continue) return;

    if (!has_location(msg)) return;

    // Emit event for handlers
    this.events.emit("location", chat_id, msg.location);
  }

  /**
   * Run middleware chain
   */
  private async run_middleware(
    chat_id: number,
    update: TelegramBot.Message | TelegramBot.CallbackQuery,
    update_type: UpdateType
  ): Promise<boolean> {
    const context: MiddlewareContext = {
      chat_id,
      bot: this,
      update_type,
      user_id: "from" in update ? update.from?.id ?? chat_id : chat_id,
      username: "from" in update ? update.from?.username : undefined,
      timestamp: Date.now(),
    };

    if ("message_id" in update) {
      context.message = update;
    } else {
      context.callback_query = update;
    }

    return this.middleware_chain.execute(context, async () => {});
  }

  /**
   * Execute an action or array of actions
   */
  private async execute_action(action: Action | Action[], context: ActionContext): Promise<void> {
    try {
      if (Array.isArray(action)) {
        for (const act of action) {
          await act(context);
        }
      } else {
        await action(context);
      }
    } catch (error) {
      this.logger.error(`Action error for chat ${context.chat_id}:`, error);

      // Navigate to error dialog if configured
      if (this.schema.error_dialog) {
        await this.change_dialog(context.chat_id, this.schema.error_dialog);
      }
    }
  }

  /**
   * Render a dialog to the user
   */
  private async render_dialog(chat_id: number, dialog: Dialog): Promise<void> {
    const state = this.dialog_manager.get_state(chat_id);

    // Resolve text
    const text = await resolve_text(dialog.text, chat_id);

    // Resolve images
    const images = await resolve_images(dialog.images, chat_id);

    // Resolve and build inline keyboard
    let inline_markup: TelegramBot.InlineKeyboardMarkup | undefined;
    const inline_buttons = await resolve_buttons<InlineButton>(dialog.inline_buttons, chat_id);
    if (inline_buttons && inline_buttons.length > 0) {
      const built = await this.keyboard_builder.build_inline(dialog.id, inline_buttons, chat_id);
      inline_markup = built;
    }

    // Resolve and build reply keyboard
    let reply_markup: TelegramBot.ReplyKeyboardMarkup | TelegramBot.ReplyKeyboardRemove | undefined;
    if (dialog.remove_reply_keyboard) {
      reply_markup = this.keyboard_builder.build_remove();
      this.dialog_manager.set_reply_keyboard_active(chat_id, false);
    } else {
      const reply_buttons = await resolve_buttons<ReplyButton>(dialog.reply_buttons, chat_id);
      if (reply_buttons && reply_buttons.length > 0) {
        reply_markup = await this.keyboard_builder.build_reply(
          dialog.id,
          reply_buttons,
          chat_id,
          dialog.reply_keyboard_options
        );
        this.dialog_manager.set_reply_keyboard_active(chat_id, true);
      }
    }

    // Determine how to send/update message
    try {
      if (images) {
        await this.render_with_images(chat_id, state, text, images, inline_markup, reply_markup, dialog);
      } else {
        await this.render_text_only(chat_id, state, text, inline_markup, reply_markup, dialog);
      }
    } catch (error) {
      const tg_error = TelegramError.from_error(error, chat_id);

      // Ignore "message not modified" errors
      if (tg_error.is_message_not_modified()) {
        return;
      }

      // Try to recover by sending new message
      this.logger.warn(`Failed to update message, sending new: ${tg_error.message}`);
      await this.send_new_message(chat_id, state, text, inline_markup, reply_markup, dialog);
    }
  }

  /**
   * Render dialog with images
   */
  private async render_with_images(
    chat_id: number,
    state: UserState,
    text: string | undefined,
    images: string | string[],
    inline_markup: TelegramBot.InlineKeyboardMarkup | undefined,
    reply_markup: TelegramBot.ReplyKeyboardMarkup | TelegramBot.ReplyKeyboardRemove | undefined,
    dialog: Dialog
  ): Promise<void> {
    // Delete previous message if it was text-only
    if (state.last_message_type === "text" && state.last_bot_message_id !== -1) {
      await this.delete_message(chat_id, state.last_bot_message_id);
    }

    const image_array = Array.isArray(images) ? images : [images];

    if (image_array.length > 1) {
      // Send media group (no inline buttons support)
      const media: InputMediaPhoto[] = image_array.map((img, idx) => ({
        type: "photo" as const,
        media: img,
        caption: idx === 0 ? text : undefined,
        parse_mode: this.config.default_parse_mode,
      }));

      const result = await this.telegram.sendMediaGroup(chat_id, media);
      const last_msg = result[result.length - 1];

      this.dialog_manager.set_last_message(chat_id, last_msg!.message_id, "media_group");

      // Send reply keyboard separately if needed
      if (reply_markup && "keyboard" in reply_markup) {
        await this.telegram.sendMessage(chat_id, "⌨️", { reply_markup });
      }
    } else {
      // Send single photo
      const result = await this.telegram.sendPhoto(chat_id, image_array[0] as string, {
        caption: text,
        parse_mode: this.config.default_parse_mode,
        reply_markup: inline_markup ?? reply_markup,
        protect_content: dialog.protect_content,
      });

      this.dialog_manager.set_last_message(chat_id, result.message_id, "photo");
    }
  }

  /**
   * Render text-only dialog
   */
  private async render_text_only(
    chat_id: number,
    state: UserState,
    text: string | undefined,
    inline_markup: TelegramBot.InlineKeyboardMarkup | undefined,
    reply_markup: TelegramBot.ReplyKeyboardMarkup | TelegramBot.ReplyKeyboardRemove | undefined,
    dialog: Dialog
  ): Promise<void> {
    const display_text = text ?? "📄";

    // Try to edit existing message if it was text
    if (state.last_message_type === "text" && state.last_bot_message_id !== -1) {
      await this.telegram.editMessageText(display_text, {
        chat_id,
        message_id: state.last_bot_message_id,
        parse_mode: this.config.default_parse_mode,
        reply_markup: inline_markup,
        disable_web_page_preview: dialog.disable_web_page_preview,
      });

      // Update reply keyboard separately if needed
      if (reply_markup) {
        // Can't edit reply keyboard, need to send new message or use sendChatAction
        // For now, we skip reply keyboard update on edit
      }
    } else {
      // Delete old message if different type
      if (state.last_bot_message_id !== -1) {
        await this.delete_message(chat_id, state.last_bot_message_id);
      }

      await this.send_new_message(chat_id, state, text, inline_markup, reply_markup, dialog);
    }
  }

  /**
   * Send a new message (used as fallback)
   */
  private async send_new_message(
    chat_id: number,
    _state: UserState,
    text: string | undefined,
    inline_markup: TelegramBot.InlineKeyboardMarkup | undefined,
    reply_markup: TelegramBot.ReplyKeyboardMarkup | TelegramBot.ReplyKeyboardRemove | undefined,
    dialog: Dialog
  ): Promise<void> {
    const display_text = text ?? "📄";

    const result = await this.telegram.sendMessage(chat_id, display_text, {
      parse_mode: this.config.default_parse_mode,
      reply_markup: inline_markup ?? reply_markup,
      disable_web_page_preview: dialog.disable_web_page_preview,
      protect_content: dialog.protect_content,
    });

    this.dialog_manager.set_last_message(chat_id, result.message_id, "text");
  }
}