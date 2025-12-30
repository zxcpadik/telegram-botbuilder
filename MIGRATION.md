# Migration Guide: v1.x to v2.0

This guide helps you upgrade from telegram-botbuilder v1.x to v2.0.

## Breaking Changes

### 1. Constructor Signature

**Before (v1.x):**
```typescript
const bot = new BotBuilder(schema, "BOT_TOKEN", { polling: true });
```

**After (v2.0):**
```typescript
const bot = new BotBuilder(schema, {
  token: "BOT_TOKEN",
  telegram_options: { polling: true },
});
```

### 2. Schema Structure

**Before (v1.x):**
```typescript
const schema: Schema = {
  start: "main",
  content: [
    {
      id: "main",
      text: "Hello",
      buttons: [[{ text: "Click", action: ChangeDialog("other") }]],
    },
  ],
  commands: [{ text: "help", action: CallbackAction("help") }],
};
```

**After (v2.0):**
```typescript
const schema: Schema = {
  start_dialog: "main",
  dialogs: [
    {
      id: "main",
      text: "Hello",
      inline_buttons: [[{ text: "Click", action: go_to("other") }]],
    },
  ],
  commands: [{ name: "help", action: emit("help") }],
};
```

### 3. Action Factories

| v1.x | v2.0 |
|------|------|
| `ChangeDialog("id")` | `go_to("id")` |
| `CallbackAction("event")` | `emit("event")` |
| `CallbackAction(fn, ...args)` | `call(fn, ...args)` |
| `WaitForData("event")` | `wait_for_text("event")` |
| `WaitForData(fn)` | `wait_for_text(fn)` |

### 4. Bot Instance Properties

| v1.x | v2.0 |
|------|------|
| `bot._bot` | `bot.telegram` |
| `bot.ActionSystem` | `bot.events` |

### 5. Middleware

**Before (v1.x):**
```typescript
bot.use(async (chat: number, msg: Message | CallbackQuery) => {
  console.log(`Message from ${chat}`);
  return false; // false = continue, true = stop
});
```

**After (v2.0):**
```typescript
bot.use(async (ctx, next) => {
  console.log(`Message from ${ctx.chat_id}`);
  await next(); // Call next() to continue, don't call to stop
});
```

### 6. Button Types

**Before (v1.x):**
```typescript
interface Button {
  text?: TextFunc;
  action?: Action[] | Action;
  url?: TextFunc;
  mini_app?: TextFunc;
}
```

**After (v2.0):**
```typescript
interface InlineButton {
  text: TextSource;
  action?: Action | Action[];
  url?: TextSource;
  web_app?: TextSource;  // Renamed from mini_app
  callback_data?: string;
}

interface ReplyButton {
  text: TextSource;
  action?: Action | Action[];
  request_contact?: boolean;
  request_location?: boolean;
  request_poll?: { type?: "quiz" | "regular" };
}
```

### 7. Dialog Lifecycle Hooks

**New in v2.0:**
```typescript
{
  id: "my_dialog",
  text: "Welcome!",
  on_enter: async (ctx) => {
    console.log(`User ${ctx.chat_id} entered from ${ctx.other_dialog_id}`);
  },
  on_leave: async (ctx) => {
    console.log(`User ${ctx.chat_id} leaving to ${ctx.other_dialog_id}`);
  },
}
```

### 8. Input Waiting

**Before (v1.x):**
```typescript
// In button action
WaitForData("input_received")

// Listener
bot.ActionSystem.once("input_received", (chat, text) => {
  console.log(text);
});
```

**After (v2.0):**
```typescript
// Option 1: Event-based (similar to v1.x)
wait_for_text("input_received")

bot.events.on("input_received", (chat_id, text) => {
  console.log(text);
});

// Option 2: Callback-based (recommended)
wait_for_text(async (chat_id, text) => {
  console.log(text);
}, {
  timeout: 60000,
  validator: (input) => input.length > 0 || "Cannot be empty",
})

// Option 3: Promise-based (in custom action)
call_with_context(async (ctx) => {
  const result = await ctx.bot.wait_for_text(ctx.chat_id, {
    timeout: 60000,
  });
  
  if (result.success) {
    console.log(result.value);
  } else if (result.cancelled) {
    console.log("User cancelled");
  } else if (result.timed_out) {
    console.log("Timeout");
  }
})
```

### 9. Commands

**Before (v1.x):**
```typescript
commands: [
  { text: "help", action: CallbackAction("show_help") },
]
```

**After (v2.0):**
```typescript
commands: [
  { 
    name: "help",  // Changed from 'text' to 'name'
    description: "Show help message",  // New: for BotFather
    action: emit("show_help"),
  },
]
```

### 10. Error Handling

**New in v2.0:**
```typescript
import { 
  BotError, 
  DialogNotFoundError, 
  TelegramError,
  ValidationError 
} from "telegram-botbuilder";

// Global error dialog
const schema: Schema = {
  start_dialog: "main",
  error_dialog: "error",  // New!
  dialogs: [
    { id: "main", text: "Hello" },
    { id: "error", text: "Something went wrong. Please /start again." },
  ],
};

// Typed errors
try {
  await bot.change_dialog(chat_id, "nonexistent");
} catch (error) {
  if (error instanceof DialogNotFoundError) {
    console.log(`Dialog ${error.dialog_id} not found`);
  }
}
```

## Step-by-Step Migration

### Step 1: Update Dependencies

```bash
npm install telegram-botbuilder@2
```

### Step 2: Update Imports

```typescript
// Before
import { BotBuilder, ChangeDialog, CallbackAction, WaitForData } from "telegram-botbuilder";

// After
import { 
  BotBuilder, 
  go_to, 
  emit, 
  call, 
  wait_for_text,
  type Schema 
} from "telegram-botbuilder";
```

### Step 3: Update Schema

```typescript
// Before
const schema = {
  start: "main",
  content: [...],
  commands: [{ text: "cmd", action: ... }],
};

// After
const schema: Schema = {
  start_dialog: "main",
  dialogs: [...],
  commands: [{ name: "cmd", action: ... }],
};
```

### Step 4: Update Dialogs

```typescript
// Before
{
  id: "menu",
  text: "Choose option",
  buttons: [
    [{ text: "Option A", action: ChangeDialog("opt_a") }],
  ],
}

// After
{
  id: "menu",
  text: "Choose option",
  inline_buttons: [
    [{ text: "Option A", action: go_to("opt_a") }],
  ],
}
```

### Step 5: Update Constructor

```typescript
// Before
const bot = new BotBuilder(schema, process.env.TOKEN!, { polling: true });

// After
const bot = new BotBuilder(schema, {
  token: process.env.TOKEN!,
  telegram_options: { polling: true },
});
```

### Step 6: Update Middleware

```typescript
// Before
bot.use(async (chat, msg) => {
  if (isBlocked(chat)) return true; // Stop
  return false; // Continue
});

// After
bot.use(async (ctx, next) => {
  if (isBlocked(ctx.chat_id)) return; // Stop (don't call next)
  await next(); // Continue
});
```

### Step 7: Update Event Listeners

```typescript
// Before
bot.ActionSystem.on("my_event", (chat, ...args) => { ... });

// After
bot.events.on("my_event", (chat_id, ...args) => { ... });
```

### Step 8: Update Direct Bot Access

```typescript
// Before
await bot._bot.sendMessage(chat, "Hello");

// After
await bot.telegram.sendMessage(chat, "Hello");
// Or use the built-in method:
await bot.send_message(chat, "Hello");
```

## New Features to Explore

After migration, consider using these new v2.0 features:

### Reply Keyboards

```typescript
{
  id: "menu",
  text: "Choose from keyboard below:",
  reply_buttons: [
    [
      { text: "📞 Contact", request_contact: true },
      { text: "📍 Location", request_location: true },
    ],
  ],
  reply_keyboard_options: {
    resize_keyboard: true,
  },
}
```

### Dialog Lifecycle

```typescript
{
  id: "form",
  text: "Fill out the form",
  on_enter: async (ctx) => {
    // Initialize form data
    ctx.bot.set_user_data(ctx.chat_id, "form", {});
  },
  on_leave: async (ctx) => {
    // Save form data
    const form = ctx.bot.get_user_data(ctx.chat_id, "form");
    await saveToDatabase(form);
  },
}
```

### Conditional Actions

```typescript
inline_buttons: [
  [{
    text: "Admin Panel",
    action: when(
      (ctx) => ctx.bot.get_user_data(ctx.chat_id, "is_admin"),
      go_to("admin"),
      notify("Access denied")
    ),
  }],
]
```

### Input Validation

```typescript
wait_for_text(handleEmail, {
  validator: (input) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input)) {
      return "Please enter a valid email address";
    }
    return true;
  },
  timeout: 120000,
  timeout_message: "Email input timed out",
})
```

## Common Issues

### Issue: "Cannot find module"

ESM requires `.js` extensions in imports. Make sure your `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

### Issue: Schema validation errors

v2.0 validates schemas by default. Check the error message for details:
```typescript
// Disable validation if needed (not recommended)
const bot = new BotBuilder(schema, {
  token: "...",
  validate_schema: false,
});
```

### Issue: Middleware not working

Remember to call `next()` to continue the chain:
```typescript
bot.use(async (ctx, next) => {
  // Your logic here
  await next(); // Don't forget this!
});
```