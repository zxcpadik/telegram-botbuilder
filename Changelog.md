# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-XX-XX

### Added

- **Reply Keyboard Support** - Full support for reply keyboards alongside inline keyboards
- **Dialog Lifecycle Hooks** - `on_enter` and `on_leave` callbacks for dialogs
- **New Action Factories**:
  - `go_to(dialog_id)` - Navigate to dialog
  - `go_to_start()` - Reset to start dialog
  - `emit(event, ...args)` - Emit event
  - `call(fn, ...args)` - Call function
  - `call_with_context(fn)` - Call function with full context
  - `wait_for_text(handler, options)` - Wait for text input with validation
  - `wait_for_file(handler, options)` - Wait for file upload
  - `wait_for_photo(handler, options)` - Wait for photo
  - `notify(text, options)` - Send notification message
  - `notify_dynamic(fn, options)` - Send dynamic notification
  - `sequence(...actions)` - Execute actions in sequence
  - `when(condition, then, else)` - Conditional execution
  - `delay(ms, action)` - Delayed execution
  - `when_data(key, predicate, then, else)` - Check user data
  - `set_data(key, value)` - Set user data
  - `delete_data(key)` - Delete user data
- **Middleware System** - Express-style middleware with `next()` pattern
- **Schema Validation** - Zod-based validation with detailed error messages
- **Configurable Logging** - Built-in logger with levels and custom logger support
- **Input Validation** - Validators for `wait_for_*` actions
- **Input Timeouts** - Configurable timeouts with messages
- **Cancel Keywords** - Cancel input waiting with keywords
- **Error Dialogs** - Global error handling dialog
- **Fallback Actions** - Handle unmatched messages
- **User Data Storage** - `set_user_data` / `get_user_data` methods
- **TypeScript Types** - Comprehensive type exports
- **Custom Errors** - `BotError`, `DialogError`, `TelegramError`, `ValidationError`

### Changed

- **BREAKING**: Constructor signature changed to single config object
- **BREAKING**: Schema structure changed:
  - `start` → `start_dialog`
  - `content` → `dialogs`
  - `buttons` → `inline_buttons`
  - `Command.text` → `Command.name`
  - `Button.mini_app` → `InlineButton.web_app`
- **BREAKING**: Action factory names changed:
  - `ChangeDialog` → `go_to`
  - `CallbackAction` → `emit` / `call`
  - `WaitForData` → `wait_for_text` / `wait_for_file`
- **BREAKING**: Middleware signature changed to `(context, next)` pattern
- **BREAKING**: Bot instance properties renamed:
  - `_bot` → `telegram`
  - `ActionSystem` → `events`
- **Module System**: Migrated from CommonJS to ESM
- **Node.js Version**: Now requires Node.js 22+
- **TypeScript**: Stricter type checking enabled

### Removed

- **BREAKING**: Removed `BotBuilderMiddleware` type (use `Middleware` instead)
- **BREAKING**: Removed `MWBreakDown` internal type
- **BREAKING**: Removed `rfdc` dependency (replaced with built-in deep copy)
- **BREAKING**: Removed `object-hash` dependency (replaced with crypto-based hashing)

### Fixed

- Proper error handling for Telegram API errors
- Memory leak in middleware result caching
- Button hash collisions with dynamic content
- Race conditions in input waiting

### Security

- Input validation to prevent injection attacks
- Schema validation prevents invalid configurations