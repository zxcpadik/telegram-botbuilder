import TelegramBot from "node-telegram-bot-api";
import { BotBuilder } from "./bot-service";

// Legacy types (deprecated but kept for backward compatibility)
export type Action = (chat: number, _bot: BotBuilder, ...args: any[]) => (Promise<any> | any);
export type ImageFunc = string | string[] | ((chat: number) => (Promise<string | string[] | undefined> | (string | string[] | undefined)));
export type TextFunc = string | ((chat: number) => (Promise<string | undefined> | (string | undefined)));

// Modern types
export type ActionHandler = (context: ActionContext, ...args: any[]) => (Promise<any> | any);
export type MessageHandler = (context: MessageContext) => (Promise<any> | any);
export type CommandHandler = (context: CommandContext) => (Promise<any> | any);
export type DataWaitHandler = (context: DataWaitContext) => (Promise<any> | any);

export interface ActionContext {
  chatId: number;
  bot: BotBuilder;
  user: any; // Can be extended with user data
}

export interface MessageContext extends ActionContext {
  message: TelegramBot.Message;
  text?: string;
  entities?: TelegramBot.MessageEntity[];
}

export interface CommandContext extends ActionContext {
  command: string;
  args?: string;
  message: TelegramBot.Message;
}

export interface DataWaitContext extends ActionContext {
  data: string;
  entities?: TelegramBot.MessageEntity[];
  captionEntities?: TelegramBot.MessageEntity[];
}

// Legacy interfaces (deprecated)
/** @deprecated Use ModernDialog instead */
export interface Dialog {
  id: string;
  text?: TextFunc;
  buttons: Button[][] | ((chat: number) => Promise<Button[][]>) | ((chat: number) => Button[][]);
  disable_btn_fp?: boolean;
  images?: ImageFunc;
}

/** @deprecated Use ModernButton instead */
export interface Button {
  text?: TextFunc;
  action?: Action[] | Action;
  url?: TextFunc;
  mini_app?: TextFunc;
}

// Modern interfaces
export interface ModernDialog {
  id: string;
  text?: string | ((context: ActionContext) => Promise<string | undefined> | string | undefined);
  buttons?: ModernButton[][] | ((context: ActionContext) => Promise<ModernButton[][]> | ModernButton[][]);
  images?: string | string[] | ((context: ActionContext) => Promise<string | string[] | undefined> | string | string[] | undefined);
  onEnter?: ActionHandler;
  onExit?: ActionHandler;
}

export interface ModernButton {
  text: string | ((context: ActionContext) => Promise<string> | string);
  action?: ActionHandler | ActionHandler[];
  url?: string | ((context: ActionContext) => Promise<string> | string);
  webApp?: string | ((context: ActionContext) => Promise<string> | string);
  style?: 'primary' | 'secondary' | 'danger' | 'success';
}

export interface ModernCommand {
  command: string;
  description?: string;
  handler: CommandHandler;
  middleware?: BotBuilderMiddleware[];
}

// Internal interfaces
export interface BotDialog extends Dialog {
  buttons: BotButton[][] | ((chat: number) => Promise<BotButton[][]>) | ((chat: number) => BotButton[][]);
}

export interface BotButton extends Button {
  _callback: string;
}

export interface InternalModernButton extends ModernButton {
  _callback: string;
}

/** @deprecated Use ModernSchema instead */
export interface Schema {
  start: string;
  content: Dialog[];
  commands?: Command[];
  enable_start?: boolean;
}

export interface ModernSchema {
  startDialog: string;
  dialogs: ModernDialog[];
  commands?: ModernCommand[];
  enableStartCommand?: boolean;
  middleware?: BotBuilderMiddleware[];
  errorHandler?: (error: Error, context: ActionContext) => Promise<void> | void;
}

export interface BotSchema extends Schema {
  content: BotDialog[];
  buttons?: BotButton[];
}

/** @deprecated Use ModernCommand instead */
export interface Command {
  text: string;
  action?: Action[] | Action;
}

export interface UserDialog {
  [key: number]: {
    dialog: string;
    lastid: number;
    waiter: { statewait: boolean; descriptor: string };
    last_type?: 'default' | 'image';
    data?: any; // For storing user-specific data
  };
}

export interface MWBreakDown {
  [key: string]: boolean | undefined | null;
}

export type BotBuilderMiddleware = (chat: number, msg: TelegramBot.Message | TelegramBot.CallbackQuery) => Promise<boolean> | boolean;
export type ModernMiddleware = (context: MessageContext | ActionContext) => Promise<boolean> | boolean;

export interface ActionCallback {
  chatid: number;
}

export type CallbackActionFunc = ((chatid: number, ...args: any[]) => void) | ((chatid: number, ...args: any[]) => Promise<void>);

// Utility types
export type ListEntity = {
  str(): Promise<string> | string;
  id: number;
  obj?: any;
};

export type Entity = {
  offset: number;
  length: number;
  type: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'pre' | 'text_link' | 'mention' | 'hashtag' | 'bot_command';
  url?: string;
};
