# telegram-botbuilder

A modern, type-safe Telegram bot framework for Node.js with an intuitive dialog-based architecture.

## Installation

```bash
npm install telegram-botbuilder
```

## Quick Start

### Modern API (Recommended)

```typescript
import { BotBuilder, ModernSchema, createDialog, createAction, bold } from 'telegram-botbuilder';

const schema: ModernSchema = {
  startDialog: 'welcome',
  dialogs: [
    createDialog({
      id: 'welcome',
      text: `${bold('Welcome!')} Choose an option:`,
      buttons: [
        [
          {
            text: 'Show Profile',
            action: createAction(async (context) => {
              await context.bot.sendMessage(context.chatId, 'Here is your profile!');
            })
          },
          {
            text: 'Settings',
            action: createAction(async (context) => {
              await context.bot.navigateToDialog(context.chatId, 'settings');
            })
          }
        ]
      ]
    }),
    createDialog({
      id: 'settings',
      text: 'Settings menu:',
      buttons: [
        [
          {
            text: '← Back',
            action: createAction(async (context) => {
              await context.bot.navigateToDialog(context.chatId, 'welcome');
            })
          }
        ]
      ]
    })
  ]
};

const bot = new BotBuilder(schema, 'YOUR_BOT_TOKEN', { polling: true });
```

## Core Concepts

### Dialogs

Dialogs are the building blocks of your bot's conversation flow. Each dialog has an ID, text content, and optional buttons.

```typescript
createDialog({
  id: 'my_dialog',
  text: 'Hello! What would you like to do?',
  buttons: [
    [
      { text: 'Option 1', action: myAction },
      { text: 'Option 2', action: anotherAction }
    ]
  ],
  images: 'https://example.com/image.jpg' // Optional
})
```

### Actions

Actions are functions that execute when buttons are pressed or other events occur.

```typescript
const myAction = createAction(async (context) => {
  const { chatId, bot, user } = context;
  
  // Send a message
  await bot.sendMessage(chatId, 'Action executed!');
  
  // Navigate to another dialog
  await bot.navigateToDialog(chatId, 'another_dialog');
  
  // Store user data
  bot.setUserData(chatId, { lastAction: 'my_action' });
});
```

### Context

All modern handlers receive a context object with useful information:

```typescript
interface ActionContext {
  chatId: number;
  bot: BotBuilder;
  user: any; // User data stored with setUserData
}
```

## Advanced Features

### User Input Handling

Wait for user input with type-safe handlers:

```typescript
const askNameAction = createAction(async (context) => {
  await context.bot.sendMessage(context.chatId, 'What is your name?');
  
  await context.bot.waitForInput(context.chatId, async (inputContext) => {
    const name = inputContext.data;
    context.bot.setUserData(context.chatId, { name });
    await context.bot.sendMessage(context.chatId, `Hello, ${name}!`);
  });
});
```

### List Management

Display paginated lists with built-in navigation:

```typescript
const items = [
  { id: 1, str: () => '📄 Document 1', obj: { type: 'doc' } },
  { id: 2, str: () => '📄 Document 2', obj: { type: 'doc' } },
  { id: 3, str: () => '📄 Document 3', obj: { type: 'doc' } }
];

const showListAction = createAction(async (context) => {
  await context.bot.showList(context.chatId, items, {
    title: 'Select a document:',
    onSelect: async (item, page) => {
      await context.bot.sendMessage(context.chatId, `Selected: ${await item.str()}`);
    },
    onExit: async () => {
      await context.bot.navigateToDialog(context.chatId, 'welcome');
    },
    pageSize: 5
  });
});
```

### Commands

Register bot commands with modern handlers:

```typescript
const schema: ModernSchema = {
  startDialog: 'welcome',
  dialogs: [...],
  commands: [
    {
      command: 'help',
      description: 'Show help information',
      handler: async (context) => {
        await context.bot.sendMessage(context.chatId, 'Help information here...');
      }
    }
  ]
};
```

### Dynamic Content

Use functions for dynamic text and buttons:

```typescript
createDialog({
  id: 'dynamic',
  text: async (context) => {
    const userData = context.bot.getUserData(context.chatId);
    return `Hello, ${userData.name || 'Guest'}!`;
  },
  buttons: async (context) => {
    const isAdmin = context.bot.getUserData(context.chatId).isAdmin;
    
    const buttons = [
      [{ text: 'Profile', action: profileAction }]
    ];
    
    if (isAdmin) {
      buttons.push([{ text: 'Admin Panel', action: adminAction }]);
    }
    
    return buttons;
  }
})
```

### Images and Media

Add images to your dialogs:

```typescript
createDialog({
  id: 'gallery',
  text: 'Check out these images:',
  images: [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg'
  ],
  buttons: [[{ text: 'Next', action: nextAction }]]
})
```

## Text Formatting

Use built-in formatting utilities:

```typescript
import { bold, italic, underline, link, code, md2html } from 'telegram-botbuilder';

const formattedText = `
${bold('Important:')} This is ${italic('very')} important!
${link('Click here', 'https://example.com')}
${code('console.log("Hello World!")')}
`;

// Convert markdown to HTML
const htmlText = md2html('**Bold** and *italic* text');
```

## User Data Management

Store and retrieve user-specific data:

```typescript
// Store data
bot.setUserData(chatId, { 
  name: 'John',
  preferences: { theme: 'dark' }
});

// Retrieve data
const userData = bot.getUserData(chatId);
console.log(userData.name); // 'John'

// Update data (merges with existing)
bot.setUserData(chatId, { lastSeen: new Date() });
```

## Error Handling

Add global error handling:

```typescript
const schema: ModernSchema = {
  startDialog: 'welcome',
  dialogs: [...],
  errorHandler: async (error, context) => {
    console.error('Bot error:', error);
    await context.bot.sendMessage(context.chatId, 'Sorry, something went wrong!');
  }
};
```

## Migration from Legacy API

The package maintains full backward compatibility. Existing bots using the legacy API will continue to work without changes.

### Legacy API (Deprecated)

```typescript
// Old way (still works)
import { Schema, BotBuilder, ChangeDialog, CallbackAction } from 'telegram-botbuilder';

const schema: Schema = {
  start: 'start_dialog',
  content: [
    {
      id: 'start_dialog',
      text: 'Welcome!',
      buttons: [
        [{
          text: 'Button',
          action: [ChangeDialog('other_dialog')]
        }]
      ]
    }
  ]
};
```

### Modern API (Recommended)

```typescript
// New way
import { ModernSchema, BotBuilder, createDialog, createAction } from 'telegram-botbuilder';

const schema: ModernSchema = {
  startDialog: 'start_dialog',
  dialogs: [
    createDialog({
      id: 'start_dialog',
      text: 'Welcome!',
      buttons: [
        [{
          text: 'Button',
          action: createAction(async (context) => {
            await context.bot.navigateToDialog(context.chatId, 'other_dialog');
          })
        }]
      ]
    })
  ]
};
```

## API Reference

### BotBuilder Class

#### Modern Methods
- `navigateToDialog(chatId, dialogId, data?)` - Navigate to a dialog with optional data
- `sendMessage(chatId, text, options?)` - Send a message with optional formatting and buttons
- `waitForInput(chatId, handler)` - Wait for user input
- `showList(chatId, items, options)` - Display a paginated list
- `setUserData(chatId, data)` - Store user data
- `getUserData(chatId)` - Retrieve user data

#### Legacy Methods (Deprecated)
- `ChangeDialog(chatId, dialogId)` - Navigate to a dialog
- `Message(chatId, text)` - Send a simple message
- `use(middleware)` - Add middleware

### Helper Functions

#### Modern
- `createDialog(config)` - Create a dialog configuration
- `createAction(handler)` - Create an action handler
- `createCommand(command, handler, description?)` - Create a command

#### Text Formatting
- `bold(text)`, `italic(text)`, `underline(text)` - Format text
- `link(text, url)` - Create a link
- `code(text)`, `pre(text)` - Format code
- `md2html(markdown)` - Convert markdown to HTML
- `formatHTML(text, entities)` - Format text with Telegram entities

#### Legacy (Deprecated)
- `ChangeDialog(dialogId)` - Create a dialog change action
- `CallbackAction(descriptor, ...args)` - Create a callback action
- `WaitForData(descriptor)` - Wait for user data

## TypeScript Support

The package is written in TypeScript and provides full type safety:

```typescript
import { ModernSchema, ActionContext, ModernDialog } from 'telegram-botbuilder';

// All types are exported and can be used for custom implementations
const myHandler = async (context: ActionContext) => {
  // Full IntelliSense support
  await context.bot.sendMessage(context.chatId, 'Typed!');
};
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.