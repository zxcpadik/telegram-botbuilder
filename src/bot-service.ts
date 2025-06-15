import TelegramBot, { InlineKeyboardButton, InputMediaPhoto } from 'node-telegram-bot-api';
import {
  Schema, Action, BotSchema, Button, BotButton, BotDialog, UserDialog, BotBuilderMiddleware, MWBreakDown, CallbackActionFunc, Dialog,
  ModernSchema, ModernDialog, ModernButton, ModernCommand, ActionContext, MessageContext, CommandContext, DataWaitContext,
  ActionHandler, MessageHandler, CommandHandler, DataWaitHandler, InternalModernButton, ListEntity, Entity
} from './bot-struct';
import EventEmitter from 'events';
import { readFileSync, rmSync } from 'fs';
import { randomBytes } from 'crypto';
import * as deepcopy from 'rfdc';
var hash = require('object-hash');

const bypass_str = 'ETELEGRAM: 400 Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message';

export class BotBuilder {
  public _bot: TelegramBot;
  private _schema: BotSchema;
  private _modernSchema?: ModernSchema;
  public ActionSystem: EventEmitter;
  private _userdialogs: UserDialog;
  private _middleware: BotBuilderMiddleware[] = [];
  private _mwbreak: MWBreakDown = {};
  private _isModern: boolean = false;

  constructor(schema: Schema | ModernSchema, token: string, options?: TelegramBot.ConstructorOptions) {
    this._bot = new TelegramBot(token, options);
    this.ActionSystem = new EventEmitter();
    this._userdialogs = {};

    // Detect if using modern schema
    if ('startDialog' in schema) {
      this._isModern = true;
      this._modernSchema = schema as ModernSchema;
      this._schema = this._convertModernToLegacy(schema as ModernSchema);
    } else {
      this._schema = schema as BotSchema;
    }

    this._schema.buttons = [];
    this._initializeButtons();
    this._setupEventHandlers();
  }

  private _convertModernToLegacy(modernSchema: ModernSchema): BotSchema {
    return {
      start: modernSchema.startDialog,
      content: modernSchema.dialogs.map(dialog => ({
        id: dialog.id,
        text: dialog.text,
        buttons: dialog.buttons as any,
        images: dialog.images
      } as BotDialog)),
      commands: modernSchema.commands?.map(cmd => ({
        text: cmd.command,
        action: this._wrapModernCommandHandler(cmd.handler)
      })),
      enable_start: modernSchema.enableStartCommand
    };
  }

  private _wrapModernCommandHandler(handler: CommandHandler): Action {
    return async (chat: number, bot: BotBuilder, args?: string) => {
      const context: CommandContext = {
        chatId: chat,
        bot: bot,
        user: {},
        command: '',
        args,
        message: {} as TelegramBot.Message
      };
      return await handler(context);
    };
  }

  // Modern API methods
  public createDialog(config: ModernDialog): ModernDialog {
    if (!this._modernSchema) {
      throw new Error('Modern API is only available when using ModernSchema');
    }
    this._modernSchema.dialogs.push(config);
    return config;
  }

  public async navigateToDialog(chatId: number, dialogId: string, data?: any): Promise<void> {
    if (data) {
      this.setUserData(chatId, data);
    }
    return this.ChangeDialog(chatId, dialogId);
  }

  public setUserData(chatId: number, data: any): void {
    if (!this._userdialogs[chatId]) {
      this._userdialogs[chatId] = {
        dialog: this._schema.start,
        lastid: -1,
        waiter: { statewait: false, descriptor: '' }
      };
    }
    this._userdialogs[chatId].data = { ...this._userdialogs[chatId].data, ...data };
  }

  public getUserData(chatId: number): any {
    return this._userdialogs[chatId]?.data || {};
  }

  public async sendMessage(chatId: number, text: string, options?: {
    parseMode?: 'HTML' | 'Markdown';
    buttons?: ModernButton[][];
    images?: string | string[];
  }): Promise<TelegramBot.Message> {
    let markup: InlineKeyboardButton[][] | undefined;
    
    if (options?.buttons) {
      markup = await this._processModernButtons(chatId, options.buttons);
    }

    if (options?.images) {
      const images = Array.isArray(options.images) ? options.images : [options.images];
      if (images.length === 1) {
        return this._bot.sendPhoto(chatId, images[0], {
          caption: text,
          parse_mode: options.parseMode || 'HTML',
          reply_markup: markup ? { inline_keyboard: markup } : undefined
        });
      } else {
        const mediaGroup = images.map(img => ({ media: img, caption: text } as InputMediaPhoto));
        const messages = await this._bot.sendMediaGroup(chatId, mediaGroup);
        return messages[0];
      }
    }

    return this._bot.sendMessage(chatId, text, {
      parse_mode: options?.parseMode || 'HTML',
      reply_markup: markup ? { inline_keyboard: markup } : undefined
    });
  }

  public async waitForInput(chatId: number, handler: DataWaitHandler): Promise<void> {
    const descriptor = randomBytes(16).toString('hex');
    this.AttachDataWait(chatId, descriptor);
    
    return new Promise((resolve) => {
      this.ActionSystem.once(descriptor, async (chat: number, data: string, entities?: TelegramBot.MessageEntity[], captionEntities?: TelegramBot.MessageEntity[]) => {
        const context: DataWaitContext = {
          chatId: chat,
          bot: this,
          user: this.getUserData(chat),
          data,
          entities,
          captionEntities
        };
        await handler(context);
        resolve();
      });

      this.ActionSystem.once(`cancel_${descriptor}`, () => {
        resolve();
      });
    });
  }

  // List driver integration
  public async showList<T extends ListEntity>(
    chatId: number,
    items: T[],
    options: {
      title: string;
      onSelect: (item: T, page: number) => Promise<void> | void;
      onExit: () => Promise<void> | void;
      pageSize?: number;
      page?: number;
    }
  ): Promise<void> {
    const pageSize = options.pageSize || 5;
    const page = Math.max(1, Math.min(options.page || 1, Math.ceil(items.length / pageSize) || 1));
    const totalPages = Math.ceil(items.length / pageSize) || 1;

    const buttons: ModernButton[][] = [[]];

    // Navigation buttons
    if (page === 1) {
      buttons[0].push({ text: 'ㅤ', action: async () => {} });
    } else {
      buttons[0].push({
        text: '⬅️',
        action: async () => {
          await this.showList(chatId, items, { ...options, page: page - 1 });
        }
      });
    }

    buttons[0].push({
      text: `${page}/${totalPages} 🔄`,
      action: async () => {
        await this.showList(chatId, items, { ...options, page });
      }
    });

    if (page === totalPages) {
      buttons[0].push({ text: 'ㅤ', action: async () => {} });
    } else {
      buttons[0].push({
        text: '➡️',
        action: async () => {
          await this.showList(chatId, items, { ...options, page: page + 1 });
        }
      });
    }

    // Item buttons
    const startIndex = pageSize * (page - 1);
    const pageItems = items.slice(startIndex, startIndex + pageSize);
    
    for (const item of pageItems) {
      buttons.push([{
        text: await item.str(),
        action: async () => await options.onSelect(item, page)
      }]);
    }

    // Exit button
    buttons.push([{
      text: 'Назад',
      action: options.onExit
    }]);

    const dialogId = `list_${randomBytes(8).toString('hex')}`;
    await this.ChangeDialog(chatId, {
      id: dialogId,
      text: options.title,
      buttons
    } as any);
  }

  private async _processModernButtons(chatId: number, buttons: ModernButton[][]): Promise<InlineKeyboardButton[][]> {
    const markup: InlineKeyboardButton[][] = [];
    
    for (let rowIndex = 0; rowIndex < buttons.length; rowIndex++) {
      markup[rowIndex] = [];
      for (const button of buttons[rowIndex]) {
        const context: ActionContext = { chatId, bot: this, user: this.getUserData(chatId) };
        
        const text = typeof button.text === 'function' ? await button.text(context) : button.text;
        const url = button.url ? (typeof button.url === 'function' ? await button.url(context) : button.url) : undefined;
        const webApp = button.webApp ? (typeof button.webApp === 'function' ? await button.webApp(context) : button.webApp) : undefined;
        
        const internalButton: InternalModernButton = {
          ...button,
          _callback: randomBytes(16).toString('hex')
        };

        if (button.action) {
          this.ActionSystem.on(internalButton._callback, async () => {
            const handlers = Array.isArray(button.action) ? button.action : [button.action!];
            for (const handler of handlers) {
              await handler(context);
            }
          });
        }

        markup[rowIndex].push({
          text,
          callback_data: webApp ? undefined : internalButton._callback,
          url,
          web_app: webApp ? { url: webApp } : undefined
        });
      }
    }
    
    return markup;
  }

  // Legacy API methods (deprecated but maintained for backward compatibility)
  
  /** @deprecated Use modern middleware system instead */
  public use(func: BotBuilderMiddleware) {
    this._middleware.push(func);
  }

  private _mwba(desc: string): Promise<boolean> {
    return new Promise(r => {
      this.ActionSystem.once(`mwb_${desc}`, r)
    });
  }

  private async _runmw(chat: number, msg: TelegramBot.Message | TelegramBot.CallbackQuery) {
    let desc = `${chat}_${(msg as TelegramBot.Message).message_id || (msg as TelegramBot.CallbackQuery).id}`;
    let mwb = this._mwbreak[desc];
    if (typeof mwb === 'boolean') return mwb;
    if (mwb === null) return await this._mwba(desc);
    this._mwbreak[desc] = null;

    let res = false;
    for (let mw of this._middleware) {
      res = res || await mw(chat, msg);
    }
    
    this._mwbreak[desc] = res;
    this.ActionSystem.emit(`mwb_${desc}`, res);
    return res;
  }

  private _hashbtn(dia: BotDialog, btn: Button) {
    return hash([dia.id, {a: btn.action, b: btn.text, c: btn.url, d: btn.mini_app }]);
  }

  private _initializeButtons() {
    try {
      for (let fp_di = 0; fp_di < this._schema.content.length; fp_di++) {
        let fp_db = this._schema.content[fp_di].buttons
        if (typeof fp_db == 'function') continue;

        for (let fp_by = 0; fp_db.length; fp_by++) {
          let fp_ln = fp_db[fp_by];
          for (let fp_bx = 0; fp_bx < fp_ln.length; fp_bx++) {
            let fp_b = fp_db[fp_by][fp_bx];
            fp_b._callback = this._hashbtn(this._schema.content[fp_di], fp_b);
            this._schema.buttons?.push(fp_b);
          }
        }
      }
    } catch {}
  }

  private _setupEventHandlers() {
    this._bot.onText(/.+/gms, async (msg) => {
      if (!this._userdialogs[msg.chat.id]) {
        this._userdialogs[msg.chat.id] = {
          dialog: this._schema.start,
          lastid: msg.message_id,
          waiter: { statewait: false, descriptor: '' }
        };
      }
      if (await this._runmw(msg.chat.id, msg)) return;

      let chat = msg.chat.id;
      if (this._userdialogs[chat]!.waiter!.statewait) {
        this._userdialogs[chat].waiter.statewait = false;
        await this._bot.deleteMessage(chat, msg.message_id).catch(() => undefined);
        this.ActionSystem.emit(this._userdialogs[chat].waiter.descriptor, chat, msg.text, msg.entities, msg.caption_entities);
        return;
      }

      // Handle commands
      let text = msg.text || '';
      if (this._schema.commands != undefined) {
        for (let cmd of this._schema.commands) {
          let r_exec = new RegExp(`^\\/(${cmd.text.trim().toLowerCase()})\\b(?:\\s+(.+))?$`, 'gms').exec(text.trim());
          if (r_exec != null) {
            if (typeof cmd.action == 'function') await cmd.action(msg.chat.id, this, (r_exec[2] as string | undefined));
            else if (Array.isArray(cmd.action)) for (let r_act of cmd.action) await r_act(msg.chat.id, this, (r_exec[2] as string | undefined));
          }
        }
      }
    });

    this._bot.on('callback_query', async (query) => {
      if (!this._userdialogs[query.message!.chat.id]) {
        this._userdialogs[query.message!.chat.id] = {
          dialog: this._schema.start,
          lastid: query.message?.message_id || -1,
          waiter: { statewait: false, descriptor: '' }
        };
      } else {
        this._userdialogs[query.message!.chat.id].lastid = query.message?.message_id || this._userdialogs[query.message!.chat.id].lastid || -1;
      }

      if (await this._runmw(query.message!.chat.id, query)) return;

      // Check for modern button callbacks
      this.ActionSystem.emit(query.data!, query.message!.chat.id);
      
      await this._activateButton(query.message!.chat.id, query.data!, query.message?.message_id);
    });

    this._bot.on('document', async (msg) => {
      if (!this._userdialogs[msg.chat.id]) {
        this._userdialogs[msg.chat.id] = {
          dialog: this._schema.start,
          lastid: msg.message_id,
          waiter: { statewait: false, descriptor: '' }
        };
      }
      if (await this._runmw(msg.chat.id, msg)) return;

      if (!msg.document) return;
      let chat = msg.chat.id;
      if (!this._userdialogs[chat].waiter.statewait) return;
      await this._bot.downloadFile(msg.document.file_id, './').then((x) => {
        this._userdialogs[chat].waiter.statewait = false;
        this._bot.deleteMessage(chat, msg.message_id).catch(() => undefined);
        let content = readFileSync(x, 'utf8');
        rmSync(x);
        this.ActionSystem.emit(this._userdialogs[chat].waiter.descriptor, chat, content);
      });
    });

    this._bot.onText(/^\/start/, async (msg) => {
      if (this._schema.enable_start === false) return;
      if (await this._runmw(msg.chat.id, msg)) return;

      if (this._userdialogs[msg.chat.id] != undefined) {
        this._bot.deleteMessage(msg.chat.id, this._userdialogs[msg.chat.id].lastid).catch(() => undefined);
      }
      this._userdialogs[msg.chat.id] = {
        dialog: this._schema.start,
        lastid: -1,
        waiter: { statewait: false, descriptor: '' }
      };
      this._bot.deleteMessage(msg.chat.id, msg.message_id).catch(() => undefined);
      this.ChangeDialog(msg.chat.id, this._schema.start);
    });
  }

  private _getDialog(id: string) {
    return this._schema.content.find(x => x.id === id);
  }

  private _getButton(callback: string) {
    return this._schema.buttons?.find(x => x._callback === callback);
  }

  private _getButtonID(callback: string) {
    return this._schema.buttons?.findIndex(x => x._callback === callback);
  }

  private async _activateButton(chat: number, btn: string | BotButton, message_id?: number) {
    let _btn: BotButton | undefined;
    if (typeof btn === 'string') { _btn = this._getButton(btn); }
    else { _btn = btn; }

    if (_btn == undefined) {
      return (this.ChangeDialog(chat, this._schema.start, message_id), void 0);
    }

    if (Array.isArray(_btn?.action)) {
      for (let act of (_btn?.action as Action[])) {
        await act(chat, this);
      }
    } else if (_btn?.action as Action) {
      await (_btn?.action as Action)(chat, this);
    }
  }

  public async ChangeDialog(chat: number, id: string | Dialog, message_id?: number) {
    if (this._userdialogs[chat] == undefined) {
      this._userdialogs[chat] = {
        dialog: this._schema.start,
        lastid: -1,
        waiter: { statewait: false, descriptor: '' }
      };
    }

    if (typeof id != 'string') {
      this._userdialogs[chat].dialog = id.id;
    } else {
      this._userdialogs[chat].dialog = id;
    }

    if (message_id != undefined) {
      this._userdialogs[chat].lastid = message_id;
    }

    if (this._userdialogs[chat].waiter.statewait) {
      this._userdialogs[chat].waiter.statewait = false;
      this.ActionSystem.emit(`cancel_${this._userdialogs[chat].waiter.descriptor}`, chat);
    }

    let dialog: BotDialog | undefined;
    if (typeof id == 'string') { dialog = this._getDialog(id); }
    else { dialog = id as BotDialog; }

    let btns: BotButton[][] = deepcopy.default()((typeof dialog?.buttons === 'function' ? await dialog?.buttons(chat) : dialog?.buttons)) || [];

    let markup: InlineKeyboardButton[][] | undefined = undefined;
    if (btns.length > 0) {
      markup = [];
      for (let b = 0; b < btns.length; b++) {
        markup[b] = [];
        for (let btn of btns[b]) {
          btn.text = typeof btn.text === 'function' ? await btn.text(chat) : btn.text;
          if (btn.url != undefined) btn.url = typeof btn.url == 'function' ? await btn.url(chat) : btn.url;
          if (btn.mini_app != undefined) btn.mini_app = typeof btn.mini_app == 'function' ? await btn.mini_app(chat) : btn.mini_app;
          btn._callback = this._hashbtn(dialog!, btn);
          let psid = this._getButtonID(btn._callback);
          if (psid == -1) this._schema.buttons?.push(btn);
          markup[b].push({ 
            text: (btn.text || ''), 
            callback_data: (btn.mini_app ? undefined : btn._callback), 
            url: btn.url, 
            web_app: (btn.mini_app != undefined ? { url: btn.mini_app } : undefined) 
          });
        }
      }
    }

    if (dialog == undefined) markup = [[{ text: "Reload", callback_data: this._schema.start }]];
    let text = typeof dialog?.text === 'function' ? await dialog?.text(chat) : dialog?.text;

    try {
      let imgs = (dialog != undefined && dialog.images != undefined) ? (typeof dialog.images == 'function' ? await dialog.images(chat) : dialog.images) : undefined;
      if (dialog != undefined && imgs != undefined) {
        if (Array.isArray(imgs) && imgs.length > 1) {
          if (this._userdialogs[chat].last_type == 'default' && this._userdialogs[chat].lastid != -1) {
            await this._bot.deleteMessage(chat, this._userdialogs[chat].lastid).catch(() => {});
          }
          let res_msg = await this._bot.sendMediaGroup(chat, imgs.map(x => { return { media: x } as InputMediaPhoto }));
          this._userdialogs[chat].lastid = res_msg.pop()?.message_id || this._userdialogs[chat].lastid;
          this._userdialogs[chat].last_type = 'image';
        } else {
          if (this._userdialogs[chat].last_type == 'default' && this._userdialogs[chat].lastid != -1) {
            await this._bot.deleteMessage(chat, this._userdialogs[chat].lastid).catch(() => {});
          }
          let img = Array.isArray(imgs) ? imgs[0]: imgs;
          let res_msg = await this._bot.sendPhoto(chat, img, { 
            caption: text || "", 
            parse_mode: 'HTML', 
            reply_markup: markup ? { inline_keyboard: markup} : undefined 
          });
          this._userdialogs[chat].lastid = res_msg.message_id || this._userdialogs[chat].lastid;
          this._userdialogs[chat].last_type = 'image';
        }
      } else {
        if (this._userdialogs[chat].last_type == 'default') {
          await this._bot.editMessageText(text || "404", { 
            chat_id: chat, 
            message_id: this._userdialogs[chat].lastid, 
            parse_mode: 'HTML', 
            reply_markup: markup ? { inline_keyboard: markup } : undefined 
          });
        } else {
          if (this._userdialogs[chat].lastid != -1) {
            await this._bot.deleteMessage(chat, this._userdialogs[chat].lastid).catch(() => {});
          }
          let res_msg = await this._bot.sendMessage(chat, text || "404", {
            parse_mode: 'HTML', 
            reply_markup: markup ? { inline_keyboard: markup} : undefined 
          });
          this._userdialogs[chat].lastid = res_msg.message_id || this._userdialogs[chat].lastid;
          this._userdialogs[chat].last_type = 'default';
        }
      }
    } catch (e) {
      if ((e as Error).message == bypass_str) return;
      if (this._userdialogs[chat].lastid != -1) {
        await this._bot.deleteMessage(chat, this._userdialogs[chat].lastid).catch(() => {});
      }
      let res_msg = await this._bot.sendMessage(chat, text || "404", {
        parse_mode: 'HTML', 
        reply_markup: markup ? { inline_keyboard: markup} : undefined 
      });
      this._userdialogs[chat].lastid = res_msg.message_id || this._userdialogs[chat].lastid;
      this._userdialogs[chat].last_type = 'default';
    }
  }

  public AttachDataWait(chat: number, descriptor: string) {
    this._userdialogs[chat].waiter.descriptor = descriptor;
    this._userdialogs[chat].waiter.statewait = true;
  }

  /** @deprecated Use sendMessage instead */
  public Message(chat: number, content: string) {
    return this._bot.sendMessage(chat, content, {parse_mode: 'HTML'});
  }
}

// Legacy helper functions (deprecated)
/** @deprecated Use modern dialog navigation instead */
export function ChangeDialog(id: string): Action {
  return (chat: number, _bot: BotBuilder) => { return _bot.ChangeDialog(chat, id); };
}

/** @deprecated Use modern action handlers instead */
export function CallbackAction(descriptor: string | CallbackActionFunc, ...args: any[]): Action {
  return async (chat: number, _bot: BotBuilder, ..._args: any[]) => {
    return typeof descriptor == 'function' ? await descriptor(chat, ...args, ..._args) : _bot.ActionSystem.emit(descriptor, chat, ...args, ..._args);
  };
}

/** @deprecated Use waitForInput method instead */
export function WaitForData(descriptor: string | CallbackActionFunc): Action {
  return async (chat: number, _bot: BotBuilder) => {
    if (typeof descriptor == 'string') {
      let _tmpds = crypto.randomUUID();
      _bot.AttachDataWait(chat, _tmpds);
      return new Promise(r => {
        _bot.ActionSystem.once(_tmpds, (...args: any[]) => {_bot.ActionSystem.emit(descriptor, ...args); return r(undefined)});
        _bot.ActionSystem.once(`cancel_${_tmpds}`, (...args: any[]) => {_bot.ActionSystem.emit(`cancel_${descriptor}`, ...args); return r(undefined)});
      });
    } else {
      let desc = crypto.randomUUID();
      _bot.AttachDataWait(chat, desc);
      return new Promise(r => {
        _bot.ActionSystem.once(desc, descriptor);
        _bot.ActionSystem.once(`cancel_${desc}`, descriptor);
        _bot.ActionSystem.once(desc, r);
        _bot.ActionSystem.once(`cancel_${desc}`, r);
      });
    }
  };
}

// Modern helper functions
export function createAction(handler: ActionHandler): ActionHandler {
  return handler;
}

export function createCommand(command: string, handler: CommandHandler, description?: string): ModernCommand {
  return { command, handler, description };
}

export function createDialog(config: ModernDialog): ModernDialog {
  return config;
}

// Utility functions
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Text formatting utilities
export function bold(str: string): string {
  return '<b>' + str + '</b>';
}

export function italic(str: string): string {
  return '<i>' + str + '</i>';
}

export function underline(str: string): string {
  return '<u>' + str + '</u>';
}

export function strikethrough(str: string): string {
  return '<s>' + str + '</s>';
}

export function link(str: string, url: string): string {
  return `<a href="${url}">${str}</a>`;
}

export function blockquote(str: string): string {
  return '<blockquote>' + str + '</blockquote>';
}

export function code(str: string): string {
  return '<code>' + str + '</code>';
}

export function pre(str: string): string {
  return '<pre>' + str + '</pre>';
}

export function md2html(str: string): string {
  return str
    .replace(/\*\*(.*?)\*\*/gm, '<b>$1</b>') // **text** -> <b>text</b>
    .replace(/\*(.*?)\*/gm, '<i>$1</i>') // *text* -> <i>text</i>
    .replace(/^>\s*(.*)$/gm, '<blockquote>$1</blockquote>') // > text -> <blockquote>text</blockquote>
    .trim();
}

export function formatHTML(originalText: string, entities: Entity[]): string {
  (entities || []).sort((a, b) => a.offset - b.offset);

  let formattedText = '';
  let lastIndex = 0;

  for (const entity of entities) {
    formattedText += originalText.slice(lastIndex, entity.offset);
    if (entity.type === 'bot_command') {
      formattedText += originalText.slice(entity.offset, entity.offset + entity.length);
      lastIndex = entity.offset + entity.length;
      continue;
    }

    let tag = '';
    switch (entity.type) {
      case 'bold':
        tag = 'b';
        break;
      case 'italic':
        tag = 'i';
        break;
      case 'underline':
        tag = 'u';
        break;
      case 'strikethrough':
        tag = 's';
        break;
      case 'code':
        tag = 'code';
        break;
      case 'pre':
        tag = 'pre';
        break;
      case 'text_link':
        if (entity.url) {
          formattedText += `<a href="${entity.url}">${originalText.slice(entity.offset, entity.offset + entity.length)}</a>`;
          lastIndex = entity.offset + entity.length;
          continue;
        }
        break;
      case 'mention':
      case 'hashtag':
        formattedText += originalText.slice(entity.offset, entity.offset + entity.length);
        lastIndex = entity.offset + entity.length;
        continue;
    }
    formattedText += `<${tag}>${originalText.slice(entity.offset, entity.offset + entity.length)}</${tag}>`;
    lastIndex = entity.offset + entity.length;
  }
  formattedText += originalText.slice(lastIndex);
  return formattedText;
}

// Legacy exports for backward compatibility
export { bold as bald }; // Keep the typo for backward compatibility
export { formatHTML as formatHTML2 };
