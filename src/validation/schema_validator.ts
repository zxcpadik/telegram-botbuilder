import { z } from "zod";
import type { Schema } from "../types/schema.js";
import type { ValidationIssue } from "../errors/validation_error.js";
import { SchemaValidationError } from "../errors/validation_error.js";

// Text source can be string or function
const text_source_schema = z.union([
  z.string(),
  z.function(),
]);

// Image source
const image_source_schema = z.union([
  z.string(),
  z.array(z.string()),
  z.function(),
]);

// Inline button
const inline_button_schema = z.object({
  text: text_source_schema,
  action: z.union([z.function(), z.array(z.function())]).optional(),
  url: text_source_schema.optional(),
  web_app: text_source_schema.optional(),
  callback_data: z.string().max(64).optional(),
}).refine(
  (btn) => !(btn.action && btn.url),
  { message: "Button cannot have both 'action' and 'url'" }
).refine(
  (btn) => !(btn.action && btn.web_app),
  { message: "Button cannot have both 'action' and 'web_app'" }
);

// Reply button
const reply_button_schema = z.object({
  text: text_source_schema,
  action: z.union([z.function(), z.array(z.function())]).optional(),
  request_contact: z.boolean().optional(),
  request_location: z.boolean().optional(),
  request_poll: z.object({
    type: z.enum(["quiz", "regular"]).optional(),
  }).optional(),
});

// Button source (array or function)
const inline_button_source_schema = z.union([
  z.array(z.array(inline_button_schema)),
  z.function(),
]);

const reply_button_source_schema = z.union([
  z.array(z.array(reply_button_schema)),
  z.function(),
]);

// Reply keyboard options
const reply_keyboard_options_schema = z.object({
  resize_keyboard: z.boolean().optional(),
  one_time_keyboard: z.boolean().optional(),
  input_field_placeholder: z.string().max(64).optional(),
  selective: z.boolean().optional(),
  is_persistent: z.boolean().optional(),
}).optional();

// Dialog
const dialog_schema = z.object({
  id: z.string().min(1, "Dialog ID cannot be empty"),
  text: text_source_schema.optional(),
  inline_buttons: inline_button_source_schema.optional(),
  reply_buttons: reply_button_source_schema.optional(),
  reply_keyboard_options: reply_keyboard_options_schema,
  remove_reply_keyboard: z.boolean().optional(),
  images: image_source_schema.optional(),
  on_enter: z.function().optional(),
  on_leave: z.function().optional(),
  disable_web_page_preview: z.boolean().optional(),
  protect_content: z.boolean().optional(),
});

// Command
const command_schema = z.object({
  name: z.string()
    .min(1, "Command name cannot be empty")
    .max(32, "Command name too long (max 32 chars)")
    .regex(/^[a-z0-9_]+$/, "Command name must be lowercase alphanumeric with underscores"),
  description: z.string().max(256).optional(),
  action: z.union([z.function(), z.array(z.function())]).optional(),
});

// Full schema
const schema_validator = z.object({
  start_dialog: z.string().min(1, "start_dialog is required"),
  dialogs: z.array(dialog_schema).min(1, "At least one dialog is required"),
  commands: z.array(command_schema).optional(),
  error_dialog: z.string().optional(),
  fallback_action: z.function().optional(),
  reply_fallback_action: z.function().optional(),
});

/**
 * Validate a schema and return the validated schema
 * @throws SchemaValidationError if validation fails
 */
export function validate_schema(schema: unknown): Schema {
  const result = schema_validator.safeParse(schema);

  if (!result.success) {
    const issues: ValidationIssue[] = result.error.issues.map((issue: any) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    throw new SchemaValidationError(issues);
  }

  const validated = result.data as Schema;

  // Additional validation: check start_dialog exists
  const dialog_ids = new Set(validated.dialogs.map((d) => d.id));

  if (!dialog_ids.has(validated.start_dialog)) {
    throw new SchemaValidationError([
      {
        path: "start_dialog",
        message: `start_dialog "${validated.start_dialog}" does not reference an existing dialog`,
      },
    ]);
  }

  // Check error_dialog exists if specified
  if (validated.error_dialog && !dialog_ids.has(validated.error_dialog)) {
    throw new SchemaValidationError([
      {
        path: "error_dialog",
        message: `error_dialog "${validated.error_dialog}" does not reference an existing dialog`,
      },
    ]);
  }

  // Check for duplicate dialog IDs
  const seen_ids = new Set<string>();
  for (const dialog of validated.dialogs) {
    if (seen_ids.has(dialog.id)) {
      throw new SchemaValidationError([
        {
          path: `dialogs`,
          message: `Duplicate dialog ID: "${dialog.id}"`,
        },
      ]);
    }
    seen_ids.add(dialog.id);
  }

  // Check for duplicate command names
  if (validated.commands) {
    const seen_commands = new Set<string>();
    for (const command of validated.commands) {
      if (seen_commands.has(command.name)) {
        throw new SchemaValidationError([
          {
            path: `commands`,
            message: `Duplicate command name: "/${command.name}"`,
          },
        ]);
      }
      seen_commands.add(command.name);
    }
  }

  return validated;
}

/**
 * Check if schema is valid without throwing
 */
export function is_valid_schema(schema: unknown): schema is Schema {
  try {
    validate_schema(schema);
    return true;
  } catch {
    return false;
  }
}