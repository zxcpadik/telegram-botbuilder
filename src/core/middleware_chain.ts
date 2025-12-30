import type { Middleware, MiddlewareContext, MiddlewareNext } from "../types/middleware.js";
import type { Logger } from "../utils/logger.js";

export class MiddlewareChain {
  private readonly middlewares: Middleware[] = [];
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Add middleware to the chain
   */
  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * Execute the middleware chain
   * Returns true if chain completed (reached final handler)
   */
  async execute(context: MiddlewareContext, final_handler: () => Promise<void>): Promise<boolean> {
    let index = 0;
    let completed = false;

    const next: MiddlewareNext = async () => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index];
        index++;

        try {
          await middleware!(context, next);
        } catch (error) {
          this.logger.error(`Middleware error:`, error);
          throw error;
        }
      } else {
        // End of chain, execute final handler
        await final_handler();
        completed = true;
      }
    };

    await next();
    return completed;
  }

  /**
   * Get number of registered middlewares
   */
  get count(): number {
    return this.middlewares.length;
  }

  /**
   * Clear all middlewares
   */
  clear(): void {
    this.middlewares.length = 0;
  }
}