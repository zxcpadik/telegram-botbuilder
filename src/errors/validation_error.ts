import { BotError } from "./bot_error.js";

export interface ValidationIssue {
  path: string;
  message: string;
}

export class ValidationError extends BotError {
  public readonly issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[] = []) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
    this.issues = issues;
  }

  public format(): string {
    if (this.issues.length === 0) {
      return this.message;
    }

    const issue_list = this.issues
      .map((issue) => `  - ${issue.path}: ${issue.message}`)
      .join("\n");

    return `${this.message}\n${issue_list}`;
  }
}

export class SchemaValidationError extends ValidationError {
  constructor(issues: ValidationIssue[]) {
    super("Schema validation failed", issues);
    this.name = "SchemaValidationError";
  }
}

export class InputValidationError extends ValidationError {
  public readonly chat_id: number;
  public readonly input: string;

  constructor(chat_id: number, input: string, message: string) {
    super(message, [{ path: "input", message }]);
    this.name = "InputValidationError";
    this.chat_id = chat_id;
    this.input = input;
  }
}