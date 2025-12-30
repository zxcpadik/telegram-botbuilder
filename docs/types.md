# Types Documentation

Complete type definitions for telegram-botbuilder v2.0.

## Table of Contents

- [Configuration Types](#configuration-types)
  - [BotConfig](#botconfig)
  - [LoggerConfig](#loggerconfig)
  - [LogLevel](#loglevel)
  - [CustomLogger](#customlogger)
- [Schema Types](#schema-types)
  - [Schema](#schema)
  - [Dialog](#dialog)
  - [Command](#command)
- [Button Types](#button-types)
  - [InlineButton](#inlinebutton)
  - [ReplyButton](#replybutton)
  - [ButtonSource](#buttonsource)
  - [ReplyKeyboardOptions](#replykeyboardoptions)
- [Action Types](#action-types)
  - [Action](#action)
  - [ActionContext](#actioncontext)
  - [DialogAction](#dialogaction)
  - [DialogActionContext](#dialogactioncontext)
  - [CallbackFunction](#callbackfunction)
- [Input Types](#input-types)
  - [WaitForInputOptions](#waitforinputoptions)
  - [WaitResult](#waitresult)
  - [FileWaitResult](#filewaitresult)
  - [InputType](#inputtype)
- [Middleware Types](#middleware-types)
  - [Middleware](#middleware)
  - [MiddlewareContext](#middlewarecontext)
  - [MiddlewareNext](#middlewarenext)
  - [UpdateType](#updatetype)
- [Dynamic Content Types](#dynamic-content-types)
  - [TextSource](#textsource)
  - [ImageSource](#imagesource)
- [State Types](#state-types)
  - [UserState](#userstate)
- [Error Types](#error-types)

---

## Configuration Types

### BotConfig

Main configuration object for BotBuilder constructor.

```typescript
interface BotConfig {
  /** Telegram bot token (required) */
  token: string;

  /** node-telegram-bot-api constructor options */
  telegram_options?: TelegramBot.ConstructorOptions;

  /** Enable /start command handling (default: true) */
  enable_start_command?: boolean;

  /** Parse mode for messages (default: "HTML") */
  default_parse_mode?: "HTML" | "Markdown" | "MarkdownV2";

  /** Logger configuration */
  logger?: LoggerConfig;

  /** Enable schema validation on startup (default: true) */
  validate_schema?: boolean;

  /** Auto-delete user messages in dialogs (default: true) */
  auto_delete_user_messages?: boolean;

  /** Default timeout for waiting input in ms (default: 300000 = 5 min) */
  default_input_timeout?: number;
}
```

**Example:**

```typescript
const config: BotConfig = {
  token: process.env.BOT_TOKEN!,
  telegram_options: {
    polling: true,
    // or for webhooks:
    // webHook: { port: 8443 }
  },
  enable_start_command: true,
  default_parse_mode: "HTML",
  validate_schema: true,
  auto_delete_user_messages: true,
  default_input_timeout: 300000,
  logger: {
    level: "info",
  },
};
```

---

### LoggerConfig

Configuration for the built-in logger.

```typescript
interface LoggerConfig {
  /** Log level (default: "info") */
  level?: LogLevel;

  /** Custom logger implementation */
  custom_logger?: CustomLogger;
}
```

**Example:**

```typescript
// Using built-in logger
const config: BotConfig = {
  token: "...",
  logger: {
    level: "debug",
  },
};

// Using custom logger (e.g., pino, winston)
import pino from "pino";
const pinoLogger = pino();

const config: BotConfig = {
  token: "...",
  logger: {
    level: "debug",
    custom_logger: {
      debug: (msg, ...args) => pinoLogger.debug(msg, ...args),
      info: (msg, ...args) => pinoLogger.info(msg, ...args),
      warn: (msg, ...args) => pinoLogger.warn(msg, ...args),
      error: (msg, ...args) => pinoLogger.error(msg, ...args),
    },
  },
};
```

---

### LogLevel

Available log levels.

```typescript
type LogLevel = "debug" | "info" | "warn" | "error" | "silent";
```

| Level | Description |
|-------|-------------|
| `debug` | Verbose debugging information |
| `info` | General information messages |
| `warn` | Warning messages |
| `error` | Error messages only |
| `silent` | No logging output |

---

### CustomLogger

Interface for implementing a custom logger.

```typescript
interface CustomLogger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}
```

---

## Schema Types

### Schema

The root schema definition for your bot.

```typescript
interface Schema {
  /** Starting dialog ID (required) */
  start_dialog: string;

  /** All dialogs (required, at least one) */
  dialogs: Dialog[];

  /** Bot commands */
  commands?: Command[];

  /** Global error dialog ID (shown on unhandled errors) */
  error_dialog?: string;

  /** Global fallback handler for unmatched messages */
  fallback_action?: Action;

  /** Fallback for unmatched reply keyboard buttons */
  reply_fallback_action?: Action;
}
```

**Example:**

```typescript
const schema: Schema = {
  start_dialog: "main",
  dialogs: [
    { id: "main", text: "Welcome!" },
    { id: "error", text: "An error occurred." },
  ],
  commands: [
    { name: "help", action: go_to("help") },
  ],
  error_dialog: "error",
  fallback_action: notify("Unknown command"),
};
```

---

### Dialog

A conversation state/screen definition.

```typescript
interface Dialog {
  /** Unique dialog identifier (required) */
  id: string;

  /** Dialog text content (supports HTML by default) */
  text?: TextSource;

  /** Inline keyboard buttons (under the message) */
  inline_buttons?: ButtonSource<InlineButton>;

  /** Reply keyboard buttons (main keyboard) */
  reply_buttons?: ButtonSource<ReplyButton>;

  /** Reply keyboard options */
  reply_keyboard_options?: ReplyKeyboardOptions;

  /** Remove reply keyboard when entering this dialog */
  remove_reply_keyboard?: boolean;

  /** Images/photos to display */
  images?: ImageSource;

  /** Called when user enters this dialog */
  on_enter?: DialogAction;

  /** Called when user leaves this dialog */
  on_leave?: DialogAction;

  /** Disable web page preview for links (default: false) */
  disable_web_page_preview?: boolean;

  /** Protect content from forwarding/saving (default: false) */
  protect_content?: boolean;
}
```

**Example:**

```typescript
const dialog: Dialog = {
  id: "profile",
  
  // Static text
  text: "<b>Your Profile</b>",
  
  // Or dynamic text
  text: async (chat_id) => {
    const user = await db.getUser(chat_id);
    return `<b>Profile</b>\nName: ${user.name}`;
  },
  
  inline_buttons: [
    [
      { text: "Edit", action: go_to("edit_profile") },
      { text: "Back", action: go_to("main") },
    ],
  ],
  
  on_enter: async (ctx) => {
    console.log(`User ${ctx.chat_id} viewing profile`);
  },
  
  on_leave: async (ctx) => {
    console.log(`User ${ctx.chat_id} left profile`);
  },
};
```

---

### Command

A bot command definition (e.g., /help, /start).

```typescript
interface Command {
  /** Command name without slash (e.g., "help", "settings") */
  name: string;

  /** Command description for BotFather */
  description?: string;

  /** Action(s) to execute */
  action?: Action | Action[];
}
```

**Example:**

```typescript
const commands: Command[] = [
  {
    name: "help",
    description: "Show help message",
    action: go_to("help"),
  },
  {
    name: "settings",
    description: "Open settings",
    action: sequence(
      notify("Opening settings..."),
      go_to("settings")
    ),
  },
  {
    name: "cancel",
    description: "Cancel current operation",
    action: [
      notify("Cancelled"),
      go_to_start(),
    ],
  },
];
```

---

## Button Types

### InlineButton

An inline keyboard button (appears under messages).

```typescript
interface InlineButton {
  /** Button label (required) */
  text: TextSource;

  /** Action(s) to execute on click */
  action?: Action | Action[];

  /** URL to open (mutually exclusive with action) */
  url?: TextSource;

  /** Mini app / Web app URL (mutually exclusive with action) */
  web_app?: TextSource;

  /** Callback data override (auto-generated if not set) */
  callback_data?: string;
}
```

**Example:**

```typescript
const buttons: InlineButton[][] = [
  // Row 1: Action buttons
  [
    { text: "✅ Confirm", action: emit("confirmed") },
    { text: "❌ Cancel", action: go_to("main") },
  ],
  // Row 2: Link button
  [
    { text: "📖 Documentation", url: "https://docs.example.com" },
  ],
  // Row 3: Web app button
  [
    { text: "🎮 Open Game", web_app: "https://game.example.com" },
  ],
  // Row 4: Dynamic text
  [
    { 
      text: async (chat_id) => {
        const count = await getNotificationCount(chat_id);
        return `🔔 Notifications (${count})`;
      },
      action: go_to("notifications"),
    },
  ],
];
```

---

### ReplyButton

A reply keyboard button (main keyboard at bottom).

```typescript
interface ReplyButton {
  /** Button label (required) */
  text: TextSource;

  /** Action(s) to execute when this text is received */
  action?: Action | Action[];

  /** Request contact from user */
  request_contact?: boolean;

  /** Request location from user */
  request_location?: boolean;

  /** Request poll from user */
  request_poll?: { type?: "quiz" | "regular" };
}
```

**Example:**

```typescript
const reply_buttons: ReplyButton[][] = [
  // Row 1: Special request buttons
  [
    { text: "📞 Share Contact", request_contact: true },
    { text: "📍 Share Location", request_location: true },
  ],
  // Row 2: Regular buttons with actions
  [
    { text: "🏠 Home", action: go_to("main") },
    { text: "⚙️ Settings", action: go_to("settings") },
  ],
  // Row 3: Poll request
  [
    { text: "📊 Create Poll", request_poll: { type: "regular" } },
  ],
];
```

---

### ButtonSource

Type for button definitions - can be static array or dynamic function.

```typescript
type ButtonSource<T> = T[][] | ((chat_id: number) => T[][] | Promise<T[][]>);
```

**Example:**

```typescript
// Static buttons
const static_buttons: ButtonSource<InlineButton> = [
  [{ text: "Button 1", action: go_to("dialog1") }],
];

// Dynamic buttons (sync)
const dynamic_sync: ButtonSource<InlineButton> = (chat_id) => {
  const is_admin = checkAdmin(chat_id);
  const buttons: InlineButton[][] = [
    [{ text: "Public Button", action: go_to("public") }],
  ];
  if (is_admin) {
    buttons.push([{ text: "🔐 Admin Panel", action: go_to("admin") }]);
  }
  return buttons;
};

// Dynamic buttons (async)
const dynamic_async: ButtonSource<InlineButton> = async (chat_id) => {
  const user = await db.getUser(chat_id);
  return [
    [{ text: `Hello, ${user.name}!`, action: notify("Hi!") }],
  ];
};
```

---

### ReplyKeyboardOptions

Configuration options for reply keyboards.

```typescript
interface ReplyKeyboardOptions {
  /** Resize keyboard to fit buttons (default: true) */
  resize_keyboard?: boolean;

  /** Hide keyboard after button press (default: false) */
  one_time_keyboard?: boolean;

  /** Placeholder text in input field */
  input_field_placeholder?: string;

  /** Show only to specific users in groups (default: false) */
  selective?: boolean;

  /** Keep keyboard persistent (default: false) */
  is_persistent?: boolean;
}
```

**Example:**

```typescript
const dialog: Dialog = {
  id: "menu",
  text: "Choose an option:",
  reply_buttons: [
    [{ text: "Option A" }, { text: "Option B" }],
  ],
  reply_keyboard_options: {
    resize_keyboard: true,
    one_time_keyboard: false,
    input_field_placeholder: "Select an option...",
    is_persistent: true,
  },
};
```

---

## Action Types

### Action

A function that executes when triggered (button click, command, etc.).

```typescript
type Action = (context: ActionContext) => void | Promise<void>;
```

**Example:**

```typescript
// Simple action
const my_action: Action = (ctx) => {
  console.log(`Action triggered by ${ctx.chat_id}`);
};

// Async action
const async_action: Action = async (ctx) => {
  await db.updateUser(ctx.chat_id, { last_action: Date.now() });
  await ctx.bot.send_message(ctx.chat_id, "Done!");
};

// Using in dialog
const dialog: Dialog = {
  id: "test",
  text: "Test",
  inline_buttons: [
    [{ text: "Click", action: my_action }],
    [{ text: "Also Click", action: async_action }],
  ],
};
```

---

### ActionContext

Context passed to action functions.

```typescript
interface ActionContext {
  /** Chat ID */
  chat_id: number;

  /** Bot instance */
  bot: BotBuilder;

  /** Additional arguments passed to action */
  args?: unknown[];

  /** Raw message (if triggered by message) */
  message?: TelegramBot.Message;

  /** Raw callback query (if triggered by inline button) */
  callback_query?: TelegramBot.CallbackQuery;

  /** Matched command arguments (for command actions) */
  command_args?: string;
}
```

**Example:**

```typescript
const handle_button: Action = async (ctx) => {
  // Access chat ID
  const chat_id = ctx.chat_id;
  
  // Access bot methods
  await ctx.bot.send_message(chat_id, "Hello!");
  await ctx.bot.change_dialog(chat_id, "other_dialog");
  
  // Access user data
  const data = ctx.bot.get_user_data<MyData>(chat_id, "my_key");
  
  // Check trigger source
  if (ctx.callback_query) {
    console.log("Triggered by inline button");
  } else if (ctx.message) {
    console.log("Triggered by message/command");
  }
  
  // Access command arguments
  if (ctx.command_args) {
    console.log(`Command args: ${ctx.command_args}`);
  }
};
```

---

### DialogAction

A function that executes on dialog enter/leave.

```typescript
type DialogAction = (context: DialogActionContext) => void | Promise<void>;
```

---

### DialogActionContext

Context passed to dialog lifecycle hooks.

```typescript
interface DialogActionContext extends ActionContext {
  /** 
   * For on_enter: Previous dialog ID
   * For on_leave: New dialog ID
   */
  other_dialog_id: string | undefined;
}
```

**Example:**

```typescript
const dialog: Dialog = {
  id: "form",
  text: "Fill out the form",
  
  on_enter: async (ctx) => {
    console.log(`Entered from: ${ctx.other_dialog_id}`);
    
    // Initialize form state
    ctx.bot.set_user_data(ctx.chat_id, "form", {
      started_at: Date.now(),
    });
  },
  
  on_leave: async (ctx) => {
    console.log(`Leaving to: ${ctx.other_dialog_id}`);
    
    // Save form state
    const form = ctx.bot.get_user_data(ctx.chat_id, "form");
    await db.saveFormDraft(ctx.chat_id, form);
  },
};
```

---

### CallbackFunction

A simple callback function type used with action factories.

```typescript
type CallbackFunction = (chat_id: number, ...args: unknown[]) => void | Promise<void>;
```

**Example:**

```typescript
// Define callback
const handle_data: CallbackFunction = async (chat_id, data, extra) => {
  console.log(`Chat ${chat_id} sent data:`, data, extra);
};

// Use with call() action
const button: InlineButton = {
  text: "Submit",
  action: call(handle_data, "some_data", { extra: true }),
};

// Use with wait_for_text()
const input_button: InlineButton = {
  text: "Enter Name",
  action: wait_for_text(async (chat_id, text) => {
    await db.setUserName(chat_id, text);
  }),
};
```

---

## Input Types

### WaitForInputOptions

Options for `wait_for_text`, `wait_for_file`, etc.

```typescript
interface WaitForInputOptions {
  /** Timeout in milliseconds (default: from config) */
  timeout?: number;

  /** Allowed input types (default: depends on wait function) */
  input_types?: InputType[];

  /** 
   * Validation function
   * Return true if valid, string for error message
   */
  validator?: (input: string) => boolean | string | Promise<boolean | string>;

  /** Message to show on validation failure */
  validation_error_message?: string;

  /** Message to show on timeout */
  timeout_message?: string;

  /** Cancel keywords (default: ["/cancel"]) */
  cancel_keywords?: string[];

  /** Message to show on cancel */
  cancel_message?: string;
}
```

**Example:**

```typescript
// Email input with validation
const email_options: WaitForInputOptions = {
  timeout: 60000, // 1 minute
  validator: (input) => {
    const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email_regex.test(input)) {
      return "Please enter a valid email address";
    }
    return true;
  },
  timeout_message: "⏰ Email input timed out",
  cancel_keywords: ["/cancel", "cancel", "back"],
  cancel_message: "Email input cancelled",
};

// Use in action
const button: InlineButton = {
  text: "Enter Email",
  action: wait_for_text(handle_email, email_options),
};
```

---

### WaitResult

Result returned from `wait_for_text`.

```typescript
interface WaitResult<T = string> {
  /** Whether input was successfully received */
  success: boolean;

  /** The input value (if success) */
  value?: T;

  /** Whether operation was cancelled by user */
  cancelled?: boolean;

  /** Whether operation timed out */
  timed_out?: boolean;

  /** Error message (if failed) */
  error?: string;
}
```

**Example:**

```typescript
const handle_input: Action = async (ctx) => {
  const result = await ctx.bot.wait_for_text(ctx.chat_id, {
    timeout: 30000,
    validator: (input) => input.length >= 3 || "Too short",
  });
  
  if (result.success) {
    await ctx.bot.send_message(ctx.chat_id, `You entered: ${result.value}`);
  } else if (result.cancelled) {
    await ctx.bot.send_message(ctx.chat_id, "Input cancelled");
  } else if (result.timed_out) {
    await ctx.bot.send_message(ctx.chat_id, "Input timed out");
  } else {
    await ctx.bot.send_message(ctx.chat_id, `Error: ${result.error}`);
  }
};
```

---

### FileWaitResult

Result returned from `wait_for_file`, `wait_for_photo`.

```typescript
interface FileWaitResult {
  /** Whether file was successfully received */
  success: boolean;

  /** Telegram file ID */
  file_id?: string;

  /** File content (for text files) */
  file_content?: string;

  /** Original file name */
  file_name?: string;

  /** MIME type */
  mime_type?: string;

  /** Whether operation was cancelled */
  cancelled?: boolean;

  /** Whether operation timed out */
  timed_out?: boolean;

  /** Error message */
  error?: string;
}
```

**Example:**

```typescript
const handle_document: Action = async (ctx) => {
  await ctx.bot.send_message(ctx.chat_id, "Please upload a JSON file:");
  
  const result = await ctx.bot.wait_for_file(ctx.chat_id, {
    input_types: ["document"],
    timeout: 120000,
  });
  
  if (result.success) {
    console.log(`File ID: ${result.file_id}`);
    console.log(`File name: ${result.file_name}`);
    console.log(`MIME type: ${result.mime_type}`);
    
    if (result.file_content) {
      const data = JSON.parse(result.file_content);
      // Process JSON data
    }
  }
};
```

---

### InputType

Types of input that can be waited for.

```typescript
type InputType = 
  | "text" 
  | "document" 
  | "photo" 
  | "video" 
  | "audio" 
  | "voice" 
  | "contact" 
  | "location";
```

---

## Middleware Types

### Middleware

A middleware function for processing updates.

```typescript
type Middleware = (
  context: MiddlewareContext,
  next: MiddlewareNext
) => void | Promise<void>;
```

**Example:**

```typescript
// Logging middleware
const logging_middleware: Middleware = async (ctx, next) => {
  const start = Date.now();
  console.log(`[${ctx.update_type}] Start - Chat: ${ctx.chat_id}`);
  
  await next();
  
  const duration = Date.now() - start;
  console.log(`[${ctx.update_type}] End - Duration: ${duration}ms`);
};

// Auth middleware
const auth_middleware: Middleware = async (ctx, next) => {
  const is_allowed = await checkUserAllowed(ctx.user_id);
  
  if (!is_allowed) {
    await ctx.bot.send_message(ctx.chat_id, "Access denied");
    return; // Don't call next() - stops chain
  }
  
  await next();
};

// Rate limiting middleware
const rate_limit: Map<number, number[]> = new Map();
const rate_limit_middleware: Middleware = async (ctx, next) => {
  const now = Date.now();
  const user_requests = rate_limit.get(ctx.chat_id) ?? [];
  
  // Keep only requests from last minute
  const recent = user_requests.filter(t => now - t < 60000);
  
  if (recent.length >= 30) {
    await ctx.bot.send_message(ctx.chat_id, "Too many requests. Please wait.");
    return;
  }
  
  recent.push(now);
  rate_limit.set(ctx.chat_id, recent);
  
  await next();
};

// Register middlewares
bot.use(logging_middleware);
bot.use(auth_middleware);
bot.use(rate_limit_middleware);
```

---

### MiddlewareContext

Context passed to middleware functions.

```typescript
interface MiddlewareContext {
  /** Chat ID */
  chat_id: number;

  /** Bot instance */
  bot: BotBuilder;

  /** Original message (if applicable) */
  message?: TelegramBot.Message;

  /** Callback query (if applicable) */
  callback_query?: TelegramBot.CallbackQuery;

  /** Type of update being processed */
  update_type: UpdateType;

  /** User ID */
  user_id: number;

  /** Username (if available) */
  username?: string;

  /** Raw update timestamp */
  timestamp: number;
}
```

---

### MiddlewareNext

Function to call to continue middleware chain.

```typescript
type MiddlewareNext = () => Promise<void>;
```

---

### UpdateType

Types of updates that can be processed.

```typescript
type UpdateType = 
  | "message" 
  | "callback_query" 
  | "command" 
  | "document" 
  | "photo" 
  | "contact" 
  | "location";
```

---

## Dynamic Content Types

### TextSource

Type for text that can be static or dynamic.

```typescript
type TextSource = string | ((chat_id: number) => string | Promise<string>);
```

**Example:**

```typescript
// Static text
const static_text: TextSource = "Hello, World!";

// Dynamic text (sync)
const dynamic_sync: TextSource = (chat_id) => {
  return `Your ID is ${chat_id}`;
};

// Dynamic text (async)
const dynamic_async: TextSource = async (chat_id) => {
  const user = await db.getUser(chat_id);
  return `Hello, ${user.name}!`;
};

// Using in dialog
const dialog: Dialog = {
  id: "greeting",
  text: async (chat_id) => {
    const user = await db.getUser(chat_id);
    const time = new Date().getHours();
    const greeting = time < 12 ? "Good morning" : time < 18 ? "Good afternoon" : "Good evening";
    return `${greeting}, <b>${user.name}</b>!`;
  },
};
```

---

### ImageSource

Type for images that can be static or dynamic.

```typescript
type ImageSource =
  | string                // Single image URL or file_id
  | string[]              // Multiple images
  | ((chat_id: number) => string | string[] | undefined | Promise<string | string[] | undefined>);
```

**Example:**

```typescript
// Single static image
const single_image: ImageSource = "https://example.com/image.jpg";

// Multiple static images
const multiple_images: ImageSource = [
  "https://example.com/image1.jpg",
  "https://example.com/image2.jpg",
];

// Dynamic image
const dynamic_image: ImageSource = async (chat_id) => {
  const user = await db.getUser(chat_id);
  return user.avatar_url; // or undefined if no avatar
};

// Dynamic multiple images
const dynamic_gallery: ImageSource = async (chat_id) => {
  const photos = await db.getUserPhotos(chat_id);
  return photos.map(p => p.url);
};

// Using in dialog
const dialog: Dialog = {
  id: "profile",
  text: "Your profile:",
  images: async (chat_id) => {
    const user = await db.getUser(chat_id);
    return user.profile_picture;
  },
};
```

---

## State Types

### UserState

Internal state tracked for each user.

```typescript
interface UserState {
  /** Current dialog ID */
  current_dialog_id: string;

  /** Last bot message ID (for editing) */
  last_bot_message_id: number;

  /** Type of last message sent */
  last_message_type: "text" | "photo" | "media_group";

  /** Whether bot is waiting for user input */
  waiting_for_input: boolean;

  /** Unique ID for current input wait */
  input_wait_id: string;

  /** Types of input being waited for */
  input_wait_types: string[];

  /** Whether reply keyboard is currently shown */
  reply_keyboard_active: boolean;

  /** Custom user data storage */
  custom_data: Record<string, unknown>;

  /** Last activity timestamp */
  last_activity: number;
}
```

**Example:**

```typescript
// Get user state
const state = bot.get_user_state(chat_id);
console.log(`Current dialog: ${state.current_dialog_id}`);
console.log(`Waiting for input: ${state.waiting_for_input}`);

// Custom data operations
bot.set_user_data(chat_id, "cart", []);
bot.set_user_data(chat_id, "language", "en");

const cart = bot.get_user_data<string[]>(chat_id, "cart");
const lang = bot.get_user_data<string>(chat_id, "language");

// Using in action
const add_to_cart: Action = (ctx) => {
  const cart = ctx.bot.get_user_data<string[]>(ctx.chat_id, "cart") ?? [];
  cart.push("new_item");
  ctx.bot.set_user_data(ctx.chat_id, "cart", cart);
};
```

---

## Error Types

The library exports several error classes for type-safe error handling.

### BotError

Base error class for all bot errors.

```typescript
class BotError extends Error {
  code: string;
  chat_id?: number;
  details?: Record<string, unknown>;
}
```

### DialogError / DialogNotFoundError

Errors related to dialog operations.

```typescript
class DialogError extends BotError {
  dialog_id?: string;
}

class DialogNotFoundError extends DialogError {
  // Thrown when a dialog ID doesn't exist
}
```

### ValidationError / SchemaValidationError

Errors related to validation.

```typescript
class ValidationError extends BotError {
  issues: Array<{ path: string; message: string }>;
  
  format(): string; // Returns formatted error message
}

class SchemaValidationError extends ValidationError {
  // Thrown when schema validation fails
}
```

### TelegramError

Wrapper for Telegram API errors.

```typescript
class TelegramError extends BotError {
  telegram_error_code?: number;
  telegram_description?: string;
  
  is_message_not_modified(): boolean;
  is_message_not_found(): boolean;
  is_blocked_by_user(): boolean;
  is_chat_not_found(): boolean;
  
  static from_error(error: unknown, chat_id?: number): TelegramError;
}
```

**Example:**

```typescript
import { 
  DialogNotFoundError, 
  TelegramError, 
  SchemaValidationError 
} from "telegram-botbuilder";

try {
  await bot.change_dialog(chat_id, "nonexistent");
} catch (error) {
  if (error instanceof DialogNotFoundError) {
    console.log(`Dialog "${error.dialog_id}" not found`);
  } else if (error instanceof TelegramError) {
    if (error.is_blocked_by_user()) {
      console.log("User blocked the bot");
    } else if (error.is_message_not_found()) {
      console.log("Message to edit not found");
    }
  }
}

// Schema validation errors
try {
  const bot = new BotBuilder(invalid_schema, config);
} catch (error) {
  if (error instanceof SchemaValidationError) {
    console.log(error.format());
    // Output:
    // Schema validation failed
    //   - start_dialog: start_dialog "main" does not reference an existing dialog
    //   - dialogs: At least one dialog is required
  }
}
```

---

## Type Utilities

### Importing Types

```typescript
// Import specific types
import type { 
  Schema, 
  Dialog, 
  InlineButton, 
  Action, 
  ActionContext,
  Middleware,
  BotConfig,
} from "telegram-botbuilder";

// Use in your code
const schema: Schema = { ... };
const config: BotConfig = { ... };
```

### Generic Patterns

```typescript
// Typing user data
interface MyUserData {
  cart: string[];
  language: "en" | "ru";
  preferences: {
    notifications: boolean;
  };
}

// Use with get_user_data
const cart = bot.get_user_data<MyUserData["cart"]>(chat_id, "cart");
const lang = bot.get_user_data<MyUserData["language"]>(chat_id, "language");

// Type-safe custom action
function create_typed_action<T>(
  key: string,
  handler: (ctx: ActionContext, value: T | undefined) => void | Promise<void>
): Action {
  return async (ctx) => {
    const value = ctx.bot.get_user_data<T>(ctx.chat_id, key);
    await handler(ctx, value);
  };
}
```

---

## See Also

- [README.md](../README.md) - Overview and quick start
- [MIGRATION.md](../MIGRATION.md) - Migration guide from v1.x
- [CHANGELOG.md](../CHANGELOG.md) - Version history