import type { Schema } from "../types/schema.js";
import type { Dialog, Command } from "../types/dialog.js";
import type { InternalSchema, InternalDialog } from "../types/internal.js";
import type { Logger } from "../utils/logger.js";
import { validate_schema } from "../validation/schema_validator.js";

export class SchemaCompiler {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Compile raw schema into internal format
   */
  compile(raw_schema: Schema, should_validate: boolean): InternalSchema {
    // Validate if requested
    if (should_validate) {
      this.logger.debug("Validating schema...");
      validate_schema(raw_schema);
      this.logger.debug("Schema validation passed");
    }

    // Build dialog map
    const dialogs = new Map<string, InternalDialog>();
    for (const dialog of raw_schema.dialogs) {
      dialogs.set(dialog.id, this.compile_dialog(dialog));
    }

    // Build command map
    const commands = new Map<string, Command>();
    if (raw_schema.commands) {
      for (const command of raw_schema.commands) {
        commands.set(command.name.toLowerCase(), command);
      }
    }

    this.logger.info(
      `Schema compiled: ${dialogs.size} dialogs, ${commands.size} commands`
    );

    return {
      start_dialog: raw_schema.start_dialog,
      dialogs,
      commands,
      inline_buttons: new Map(), // Populated dynamically
      reply_buttons: new Map(),  // Populated dynamically
      error_dialog: raw_schema.error_dialog,
      fallback_action: raw_schema.fallback_action,
      reply_fallback_action: raw_schema.reply_fallback_action,
    };
  }

  /**
   * Compile a single dialog
   */
  private compile_dialog(dialog: Dialog): InternalDialog {
    return {
      ...dialog,
      // Internal fields added during runtime
      _compiled_inline_buttons: undefined,
      _compiled_reply_buttons: undefined,
    };
  }

  /**
   * Get dialog by ID
   */
  static get_dialog(schema: InternalSchema, dialog_id: string): InternalDialog | undefined {
    return schema.dialogs.get(dialog_id);
  }

  /**
   * Get command by name
   */
  static get_command(schema: InternalSchema, command_name: string): Command | undefined {
    return schema.commands.get(command_name.toLowerCase());
  }
}