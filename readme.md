# telegram-botbuilder

> 🤖 Declarative dialog-based Telegram bot framework for Node.js

[![npm version](https://img.shields.io/npm/v/telegram-botbuilder.svg)](https://www.npmjs.com/package/telegram-botbuilder)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/telegram-botbuilder.svg)](https://nodejs.org)

Build Telegram bots with a simple, declarative dialog-based approach. Define your bot's conversation flow as a schema of dialogs and let the framework handle the rest.

## ✨ Features

- 📝 **Declarative Schema** - Define dialogs, buttons, and commands in a clear structure
- 🔀 **Dialog Navigation** - Seamless transitions between conversation states
- ⌨️ **Dual Keyboard Support** - Both inline and reply keyboards
- 🔗 **Action Chaining** - Compose complex behaviors from simple actions
- 🛡️ **Type-Safe** - Full TypeScript support with strict types
- 🔌 **Middleware System** - Extend functionality with custom middleware
- ✅ **Schema Validation** - Catch configuration errors early with Zod validation
- 📊 **Configurable Logging** - Built-in logger with custom logger support
- 🎯 **Input Handling** - Wait for text, files, photos with validation and timeouts

## 📦 Installation

```bash
npm install telegram-botbuilder
```

## 🚀 Quick Start

```typescript
import { BotBuilder, go_to, notify, type Schema } from "telegram-botbuilder";

const schema: Schema = {
  start_dialog: "welcome",
  
  dialogs: [
    {
      id: "welcome",
      text: "👋 Welcome! Choose an option:",
      inline_buttons: [
        [
          { text: "📖 About", action: go_to("about") },
          { text: "⚙️ Settings", action: go_to("settings") },
        ],
        [
          { text: "❓ Help", action: notify("This is a help message!") },
        ],
      ],
    },
    {
      id: "about",
      text: "ℹ️ This is a demo bot built with telegram-botbuilder.",
      inline_buttons: [
        [{ text: "⬅️ Back", action: go_to("welcome") }],
      ],
    },
    {
      id: "settings",
      text: "⚙️ Settings menu",
      inline_buttons: [
        [{ text: "⬅️ Back", action: go_to("welcome") }],
      ],
    },
  ],
  
  commands: [
    { name: "help", action: notify("Use /start to begin!") },
  ],
};

const bot = new BotBuilder(schema, {
  token: process.env.BOT_TOKEN!,
  telegram_options: { polling: true },
});

console.log("Bot is running...");
```

## 📚 Core Concepts

### Schema

The schema defines your entire bot structure:

```typescript
interface Schema {
  start_dialog: string;           // Initial dialog ID
  dialogs: Dialog[];              // All dialogs
  commands?: Command[];           // Bot commands
  error_dialog?: string;          // Shown on errors
  fallback_action?: Action;       // Unmatched messages
}
```

### Dialogs

Dialogs are conversation states with text and buttons:

```typescript
interface Dialog {
  id: string;                     // Unique identifier
  text?: TextSource;              // Message text (string or function)
  inline_buttons?: ButtonSource;  // Inline keyboard
  reply_buttons?: ButtonSource;   // Reply keyboard
  images?: ImageSource;           // Photos to display
  on_enter?: DialogAction;        // Called when entering
  on_leave?: DialogAction;        // Called when leaving
}
```

### Dynamic Content

Text, buttons, and images can be static or dynamic:

```typescript
// Static
text: "Hello, world!"

// Dynamic (sync)
text: (chat_id) => `Hello, user ${chat_id}!`

// Dynamic (async)
text: async (chat_id) => {
  const user = await db.getUser(chat_id);
  return `Hello, ${user.name}!`;
}
```

### Buttons

#### Inline Buttons (under messages)

```typescript
inline_buttons: [
  [
    { text: "Click me", action: go_to("other_dialog") },
    { text: "Open link", url: "https://example.com" },
  ],
  [
    { text: "Web App", web_app: "https://webapp.example.com" },
  ],
]
```

#### Reply Buttons (main keyboard)

```typescript
reply_buttons: [
  [
    { text: "📞 Share Contact", request_contact: true },
    { text: "📍 Share Location", request_location: true },
  ],
  [
    { text: "Option A", action: go_to("option_a") },
    { text: "Option B", action: go_to("option_b") },
  ],
],
reply_keyboard_options: {
  resize_keyboard: true,
  one_time_keyboard: false,
}
```

## 🎬 Actions

Actions are functions that execute when buttons are clicked or commands are received.

### Navigation

```typescript
import { go_to, go_to_start } from "telegram-botbuilder";

// Navigate to specific dialog
go_to("dialog_id")

// Reset to start dialog
go_to_start()
```

### Messaging

```typescript
import { notify, notify_dynamic } from "telegram-botbuilder";

// Send static message
notify("Hello!")

// Auto-delete after 5 seconds
notify("Temporary message", { auto_delete_ms: 5000 })

// Dynamic message
notify_dynamic((chat_id) => `Your ID: ${chat_id}`)
```

### Event Emission

```typescript
import { emit, call } from "telegram-botbuilder";

// Emit event
emit("button_clicked", "extra_data")

// Listen for event
bot.events.on("button_clicked", (chat_id, data) => {
  console.log(`User ${chat_id} clicked, data: ${data}`);
});

// Call function directly
call(async (chat_id, ...args) => {
  await someAsyncOperation(chat_id);
}, arg1, arg2)
```

### Input Waiting

```typescript
import { wait_for_text, wait_for_file, wait_for_photo } from "telegram-botbuilder";

// Wait for text input
wait_for_text(async (chat_id, text) => {
  console.log(`User ${chat_id} entered: ${text}`);
}, {
  timeout: 60000,              // 1 minute timeout
  validator: (input) => {      // Validation
    if (input.length < 3) return "Too short!";
    return true;
  },
  cancel_keywords: ["/cancel", "cancel"],
})

// Wait for file
wait_for_file("file_received", {
  input_types: ["document", "photo"],
})

// Wait for photo specifically
wait_for_photo((chat_id, result) => {
  console.log(`Photo file_id: ${result.file_id}`);
})
```

### Control Flow

```typescript
import { sequence, when, delay, when_data, set_data } from "telegram-botbuilder";

// Execute multiple actions
sequence(
  notify("Step 1"),
  delay(1000, notify("Step 2")),
  go_to("next_dialog")
)

// Conditional execution
when(
  (ctx) => ctx.bot.get_user_data(ctx.chat_id, "is_admin"),
  go_to("admin_panel"),
  notify("Access denied")
)

// Check user data
when_data<boolean>("premium", 
  (value) => value === true,
  go_to("premium_features"),
  notify("Upgrade to premium!")
)

// Set/modify user data
set_data("counter", (chat_id) => {
  const current = bot.get_user_data<number>(chat_id, "counter") ?? 0;
  return current + 1;
})
```

## 🔌 Middleware

Add custom logic to process all updates:

```typescript
// Logging middleware
bot.use(async (ctx, next) => {
  console.log(`[${ctx.update_type}] User ${ctx.chat_id}`);
  await next(); // Continue to next middleware/handler
});

// Auth middleware
bot.use(async (ctx, next) => {
  const allowed = await checkUserAllowed(ctx.user_id);
  if (!allowed) {
    await ctx.bot.send_message(ctx.chat_id, "Access denied");
    return; // Don't call next() - stops processing
  }
  await next();
});

// Rate limiting
const requests = new Map<number, number>();
bot.use(async (ctx, next) => {
  const count = requests.get(ctx.chat_id) ?? 0;
  if (count > 10) {
    await ctx.bot.send_message(ctx.chat_id, "Too many requests!");
    return;
  }
  requests.set(ctx.chat_id, count + 1);
  setTimeout(() => requests.delete(ctx.chat_id), 60000);
  await next();
});
```

## 🎛️ Configuration

```typescript
const bot = new BotBuilder(schema, {
  token: "YOUR_BOT_TOKEN",
  
  // Telegram API options
  telegram_options: {
    polling: true,
    // or webhook configuration
  },
  
  // Enable /start command (default: true)
  enable_start_command: true,
  
  // Parse mode for messages (default: "HTML")
  default_parse_mode: "HTML",
  
  // Schema validation (default: true)
  validate_schema: true,
  
  // Auto-delete user messages (default: true)
  auto_delete_user_messages: true,
  
  // Default input timeout (default: 5 minutes)
  default_input_timeout: 300000,
  
  // Logging
  logger: {
    level: "info", // "debug" | "info" | "warn" | "error" | "silent"
    
    // Custom logger (optional)
    custom_logger: {
      debug: (msg, ...args) => myLogger.debug(msg, ...args),
      info: (msg, ...args) => myLogger.info(msg, ...args),
      warn: (msg, ...args) => myLogger.warn(msg, ...args),
      error: (msg, ...args) => myLogger.error(msg, ...args),
    },
  },
});
```

## 📖 API Reference

### BotBuilder

```typescript
class BotBuilder {
  // Properties
  telegram: TelegramBot;           // Raw telegram bot instance
  events: EventEmitter;            // Event emitter
  
  // Methods
  use(middleware: Middleware): this;
  change_dialog(chat_id: number, dialog_id: string): Promise<void>;
  send_message(chat_id: number, text: string, options?): Promise<Message>;
  get_user_state(chat_id: number): UserState;
  set_user_data(chat_id: number, key: string, value: unknown): void;
  get_user_data<T>(chat_id: number, key: string): T | undefined;
  reset_user(chat_id: number): Promise<void>;
  delete_message(chat_id: number, message_id: number): Promise<boolean>;
  get_dialog(dialog_id: string): Dialog | undefined;
  wait_for_text(chat_id: number, options?): Promise<WaitResult<string>>;
  wait_for_file(chat_id: number, options?): Promise<FileWaitResult>;
  stop(): Promise<void>;
}
```

### Types

See [types documentation](./docs/types.md) for complete type definitions.

## 🔄 Migration from v1.x

See [MIGRATION.md](./MIGRATION.md) for detailed migration guide.

### Quick Changes

| v1.x | v2.0 |
|------|------|
| `new BotBuilder(schema, token, options)` | `new BotBuilder(schema, { token, ...options })` |
| `schema.start` | `schema.start_dialog` |
| `schema.content` | `schema.dialogs` |
| `dialog.buttons` | `dialog.inline_buttons` |
| `ChangeDialog(id)` | `go_to(id)` |
| `CallbackAction(desc)` | `emit(desc)` |
| `WaitForData(desc)` | `wait_for_text(handler)` |
| `_bot` | `telegram` |
| `ActionSystem` | `events` |

## 📄 License

MIT © [zxcpadik](https://github.com/zxcpadik)