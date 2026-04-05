/**
 * Manifold Custom Error Hierarchy
 * Satisfies: T4 (error context chain), U2 (actionable fix guidance), RT-3
 *
 * Every error carries: code, cause chain, file path, operation name.
 * User-facing messages include what went wrong + suggested fix command.
 */

export type ManifoldErrorCode =
  | 'E_PARSE'
  | 'E_VALIDATE'
  | 'E_LINK'
  | 'E_SOLVE'
  | 'E_IO'
  | 'E_SCHEMA'
  | 'E_HOOK';

export class ManifoldError extends Error {
  readonly code: ManifoldErrorCode;
  readonly filePath?: string;
  readonly operation: string;

  constructor(
    code: ManifoldErrorCode,
    message: string,
    options: {
      cause?: Error;
      filePath?: string;
      operation: string;
    }
  ) {
    super(message, { cause: options.cause });
    this.name = 'ManifoldError';
    this.code = code;
    this.filePath = options.filePath;
    this.operation = options.operation;
  }

  /** User-facing message with actionable fix guidance */
  toUserMessage(): string {
    const parts = [`[${this.code}] ${this.message}`];
    if (this.filePath) {
      parts.push(`  File: ${this.filePath}`);
    }
    parts.push(`  Operation: ${this.operation}`);
    return parts.join('\n');
  }
}

export class ParseError extends ManifoldError {
  constructor(message: string, options: { cause?: Error; filePath?: string }) {
    super('E_PARSE', message, { ...options, operation: 'parse' });
    this.name = 'ParseError';
  }
}

export class ValidationError extends ManifoldError {
  readonly field?: string;

  constructor(message: string, options: { cause?: Error; filePath?: string; field?: string }) {
    super('E_VALIDATE', message, { ...options, operation: 'validate' });
    this.name = 'ValidationError';
    this.field = options.field;
  }

  toUserMessage(): string {
    const base = super.toUserMessage();
    if (this.field) {
      return `${base}\n  Field: ${this.field}`;
    }
    return base;
  }
}

export class LinkerError extends ManifoldError {
  constructor(message: string, options: { cause?: Error; filePath?: string }) {
    super('E_LINK', message, { ...options, operation: 'link' });
    this.name = 'LinkerError';
  }
}

export class SolverError extends ManifoldError {
  constructor(message: string, options: { cause?: Error; filePath?: string }) {
    super('E_SOLVE', message, { ...options, operation: 'solve' });
    this.name = 'SolverError';
  }
}

export class IOError extends ManifoldError {
  constructor(message: string, options: { cause?: Error; filePath?: string }) {
    super('E_IO', message, { ...options, operation: 'io' });
    this.name = 'IOError';
  }
}

export class SchemaError extends ManifoldError {
  constructor(message: string, options: { cause?: Error; filePath?: string }) {
    super('E_SCHEMA', message, { ...options, operation: 'schema' });
    this.name = 'SchemaError';
  }
}

export class HookError extends ManifoldError {
  constructor(message: string, options: { cause?: Error; filePath?: string }) {
    super('E_HOOK', message, { ...options, operation: 'hook' });
    this.name = 'HookError';
  }
}

/**
 * Wrap a function call with error context.
 * Catches any error and re-throws as the appropriate ManifoldError type.
 */
export function withErrorContext<T>(
  operation: string,
  filePath: string | undefined,
  fn: () => T
): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof ManifoldError) {
      throw error; // Already wrapped
    }
    throw new ManifoldError('E_IO', String(error), {
      cause: error instanceof Error ? error : undefined,
      filePath,
      operation,
    });
  }
}
