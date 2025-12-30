## Usage Example

Here's a complete example showing many features:

```typescript
// example/bot.ts
import {
  BotBuilder,
  go_to,
  go_to_start,
  emit,
  call,
  notify,
  wait_for_text,
  sequence,
  when,
  set_data,
  when_data,
  type Schema,
  type ActionContext,
} from "telegram-botbuilder";

// Database simulation
const users = new Map<number, { name?: string; email?: string }>();

const schema: Schema = {
  start_dialog: "welcome",
  error_dialog: "error",

  dialogs: [
    // Welcome screen
    {
      id: "welcome",
      text: "<b>👋 Welcome to the Demo Bot!</b>\n\nChoose an action below:",
      inline_buttons: [
        [
          { text: "📝 Register", action: go_to("register_name") },
          { text: "👤 Profile", action: go_to("profile") },
        ],
        [
          { text: "⚙️ Settings", action: go_to("settings") },
          { text: "❓ Help", action: go_to("help") },
        ],
      ],
      on_enter: async (ctx) => {
        console.log(`User ${ctx.chat_id} entered welcome`);
      },
    },

    // Registration flow
    {
      id: "register_name",
      text: "📝 <b>Registration</b>\n\nPlease enter your name:",
      inline_buttons: [
        [{ text: "❌ Cancel", action: go_to("welcome") }],
      ],
      on_enter: async (ctx) => {
        // Initialize registration data
        ctx.bot.set_user_data(ctx.chat_id, "registering", true);
      },
    },

    {
      id: "register_email",
      text: (chat_id) => {
        const name = users.get(chat_id)?.name ?? "User";
        return `📝 <b>Registration</b>\n\nNice to meet you, <b>${name}</b>!\n\nNow enter your email:`;
      },
      inline_buttons: [
        [{ text: "⬅️ Back", action: go_to("register_name") }],
        [{ text: "❌ Cancel", action: go_to("welcome") }],
      ],
    },

    {
      id: "register_complete",
      text: (chat_id) => {
        const user = users.get(chat_id);
        return `✅ <b>Registration Complete!</b>\n\n` +
          `Name: ${user?.name}\n` +
          `Email: ${user?.email}`;
      },
      inline_buttons: [
        [{ text: "🏠 Home", action: go_to("welcome") }],
      ],
      on_enter: async (ctx) => {
        ctx.bot.set_user_data(ctx.chat_id, "registering", false);
        ctx.bot.set_user_data(ctx.chat_id, "registered", true);
      },
    },

    // Profile
    {
      id: "profile",
      text: (chat_id) => {
        const user = users.get(chat_id);
        if (!user?.name) {
          return "👤 <b>Profile</b>\n\nYou haven't registered yet.";
        }
        return `👤 <b>Profile</b>\n\nName: ${user.name}\nEmail: ${user.email}`;
      },
      inline_buttons: (chat_id) => {
        const user = users.get(chat_id);
        if (!user?.name) {
          return [
            [{ text: "📝 Register Now", action: go_to("register_name") }],
            [{ text: "⬅️ Back", action: go_to("welcome") }],
          ];
        }
        return [
          [{ text: "✏️ Edit Name", action: go_to("edit_name") }],
          [{ text: "⬅️ Back", action: go_to("welcome") }],
        ];
      },
    },

    // Settings with reply keyboard
    {
      id: "settings",
      text: "⚙️ <b>Settings</b>\n\nUse the keyboard below:",
      reply_buttons: [
        [
          { text: "🔔 Notifications", action: emit("toggle_notifications") },
          { text: "🌐 Language", action: go_to("language") },
        ],
        [
          { text: "🏠 Home", action: go_to("welcome") },
        ],
      ],
      reply_keyboard_options: {
        resize_keyboard: true,
      },
    },

    {
      id: "language",
      text: "🌐 <b>Language</b>\n\nSelect your language:",
      inline_buttons: [
        [
          { text: "🇺🇸 English", action: sequence(set_data("lang", "en"), notify("Language set to English")) },
          { text: "🇷🇺 Русский", action: sequence(set_data("lang", "ru"), notify("Язык установлен на Русский")) },
        ],
        [{ text: "⬅️ Back", action: go_to("settings") }],
      ],
      remove_reply_keyboard: true,
    },

    // Help
    {
      id: "help",
      text: "❓ <b>Help</b>\n\n" +
        "This is a demo bot showcasing telegram-botbuilder v2.0 features:\n\n" +
        "• Dialog navigation\n" +
        "• Inline & reply keyboards\n" +
        "• Input waiting with validation\n" +
        "• User data storage\n" +
        "• Middleware support\n\n" +
        "Commands:\n" +
        "/start - Restart bot\n" +
        "/help - Show this help\n" +
        "/cancel - Cancel current operation",
      inline_buttons: [
        [{ text: "⬅️ Back", action: go_to("welcome") }],
      ],
    },

    // Error dialog
    {
      id: "error",
      text: "❌ <b>Something went wrong</b>\n\nPlease try again.",
      inline_buttons: [
        [{ text: "🏠 Go Home", action: go_to_start() }],
      ],
    },

    // Edit name
    {
      id: "edit_name",
      text: "✏️ Enter your new name:",
      inline_buttons: [
        [{ text: "❌ Cancel", action: go_to("profile") }],
      ],
    },
  ],

  commands: [
    {
      name: "help",
      description: "Show help message",
      action: go_to("help"),
    },
    {
      name: "cancel",
      description: "Cancel current operation",
      action: sequence(
        notify("Operation cancelled"),
        go_to("welcome")
      ),
    },
    {
      name: "profile",
      description: "View your profile",
      action: go_to("profile"),
    },
  ],

  fallback_action: notify("I don't understand. Use the buttons or /help."),
};

// Create bot
const bot = new BotBuilder(schema, {
  token: process.env.BOT_TOKEN!,
  telegram_options: { polling: true },
  logger: { level: "debug" },
});

// Logging middleware
bot.use(async (ctx, next) => {
  console.log(`[${ctx.update_type}] Chat: ${ctx.chat_id}, User: @${ctx.username ?? "unknown"}`);
  await next();
});

// Handle registration name input
bot.events.on("register_name_input", async (chat_id: number, name: string) => {
  const user = users.get(chat_id) ?? {};
  user.name = name;
  users.set(chat_id, user);
  await bot.change_dialog(chat_id, "register_email");
});

// Handle registration email input  
bot.events.on("register_email_input", async (chat_id: number, email: string) => {
  const user = users.get(chat_id) ?? {};
  user.email = email;
  users.set(chat_id, user);
  await bot.change_dialog(chat_id, "register_complete");
});

// Handle edit name input
bot.events.on("edit_name_input", async (chat_id: number, name: string) => {
  const user = users.get(chat_id) ?? {};
  user.name = name;
  users.set(chat_id, user);
  await bot.send_message(chat_id, `✅ Name updated to: ${name}`);
  await bot.change_dialog(chat_id, "profile");
});

// Handle notification toggle
bot.events.on("toggle_notifications", async (chat_id: number) => {
  const current = bot.get_user_data<boolean>(chat_id, "notifications") ?? true;
  bot.set_user_data(chat_id, "notifications", !current);
  await bot.send_message(chat_id, `🔔 Notifications ${!current ? "enabled" : "disabled"}`);
});

// Setup input handlers for dialogs
bot.use(async (ctx, next) => {
  const state = bot.get_user_state(ctx.chat_id);
  
  // Register name dialog - wait for name
  if (state.current_dialog_id === "register_name" && ctx.update_type === "message") {
    const msg = ctx.message;
    if (msg?.text && !msg.text.startsWith("/")) {
      if (msg.text.length < 2) {
        await bot.send_message(ctx.chat_id, "Name must be at least 2 characters");
        return;
      }
      bot.events.emit("register_name_input", ctx.chat_id, msg.text);
      return;
    }
  }
  
  // Register email dialog - wait for email
  if (state.current_dialog_id === "register_email" && ctx.update_type === "message") {
    const msg = ctx.message;
    if (msg?.text && !msg.text.startsWith("/")) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(msg.text)) {
        await bot.send_message(ctx.chat_id, "Please enter a valid email address");
        return;
      }
      bot.events.emit("register_email_input", ctx.chat_id, msg.text);
      return;
    }
  }
  
  // Edit name dialog
  if (state.current_dialog_id === "edit_name" && ctx.update_type === "message") {
    const msg = ctx.message;
    if (msg?.text && !msg.text.startsWith("/")) {
      if (msg.text.length < 2) {
        await bot.send_message(ctx.chat_id, "Name must be at least 2 characters");
        return;
      }
      bot.events.emit("edit_name_input", ctx.chat_id, msg.text);
      return;
    }
  }
  
  await next();
});

console.log("🤖 Bot is running...");

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  await bot.stop();
  process.exit(0);
});
```