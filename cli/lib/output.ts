/**
 * Output Formatting for Manifold CLI
 * Satisfies: U3 (--json flag), U4 (TTY detection), U5 (Colors), RT-6 (TTY/color handling)
 */

import type { ManifoldPhase, SchemaVersion } from './parser.js';

// Check if stdout is a TTY
const isTTY = process.stdout.isTTY ?? false;

// Check for NO_COLOR environment variable (https://no-color.org/)
const noColorEnv = 'NO_COLOR' in process.env;

// Global color state
let colorEnabled = isTTY && !noColorEnv;
let forceColor = false;

/**
 * Configure color output
 * Satisfies: U5 (--no-color and --force-color flags)
 */
export function setColorMode(mode: 'auto' | 'always' | 'never'): void {
  switch (mode) {
    case 'always':
      colorEnabled = true;
      forceColor = true;
      break;
    case 'never':
      colorEnabled = false;
      forceColor = false;
      break;
    case 'auto':
    default:
      colorEnabled = isTTY && !noColorEnv;
      forceColor = false;
      break;
  }
}

/**
 * Check if colors are enabled
 */
export function colorsEnabled(): boolean {
  return colorEnabled;
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Bright colors
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
};

/**
 * Apply color if enabled
 */
function color(code: keyof typeof colors, text: string): string {
  if (!colorEnabled) return text;
  return `${colors[code]}${text}${colors.reset}`;
}

/**
 * Styled text helpers
 */
export const style = {
  bold: (text: string) => color('bold', text),
  dim: (text: string) => color('dim', text),

  // Status colors
  success: (text: string) => color('green', text),
  error: (text: string) => color('red', text),
  warning: (text: string) => color('yellow', text),
  info: (text: string) => color('blue', text),

  // Semantic colors
  phase: (text: string) => color('cyan', text),
  feature: (text: string) => color('magenta', text),
  constraint: (text: string) => color('blue', text),

  // Status indicators
  check: () => color('green', '✓'),
  cross: () => color('red', '✗'),
  warn: () => color('yellow', '⚠'),
  bullet: () => color('dim', '•'),
  arrow: () => color('dim', '→'),
};

/**
 * Format phase with progress indicator
 * Matches /m-status output format
 */
export function formatPhase(phase: ManifoldPhase): string {
  const phases: ManifoldPhase[] = [
    'INITIALIZED',
    'CONSTRAINED',
    'TENSIONED',
    'ANCHORED',
    'GENERATED',
    'VERIFIED'
  ];

  const idx = phases.indexOf(phase);
  const progress = idx >= 0 ? `${idx + 1}/6` : '?/6';

  // Color code based on progress
  let coloredPhase: string;
  if (phase === 'VERIFIED') {
    coloredPhase = style.success(phase);
  } else if (idx >= 3) {
    coloredPhase = style.info(phase);
  } else {
    coloredPhase = style.warning(phase);
  }

  return `${coloredPhase} (${progress})`;
}

/**
 * Format schema version
 */
export function formatSchemaVersion(version: SchemaVersion): string {
  return `v${version}`;
}

/**
 * Format convergence status
 */
export function formatConvergence(status: string): string {
  switch (status) {
    case 'CONVERGED':
      return style.success('CONVERGED');
    case 'IN_PROGRESS':
      return style.warning('IN PROGRESS');
    case 'NOT_STARTED':
      return style.dim('NOT STARTED');
    default:
      return style.dim(status);
  }
}

/**
 * Format constraint counts summary
 */
export function formatConstraintSummary(counts: Record<string, number>): string {
  const parts: string[] = [];

  if (counts.business) parts.push(`Business: ${counts.business}`);
  if (counts.technical) parts.push(`Technical: ${counts.technical}`);
  if (counts.user_experience) parts.push(`UX: ${counts.user_experience}`);
  if (counts.security) parts.push(`Security: ${counts.security}`);
  if (counts.operational) parts.push(`Operational: ${counts.operational}`);

  return parts.length > 0 ? parts.join(', ') : 'None discovered';
}

/**
 * Format tension summary
 */
export function formatTensionSummary(resolved: number, total: number): string {
  if (total === 0) return 'None detected';

  if (resolved === total) {
    return style.success(`${total} detected, all resolved`);
  } else {
    const unresolved = total - resolved;
    return style.warning(`${total} detected, ${unresolved} unresolved`);
  }
}

/**
 * Format validation result
 */
export function formatValidationResult(valid: boolean, errorCount: number, warningCount: number): string {
  if (valid && warningCount === 0) {
    return `${style.check()} ${style.success('Valid')}`;
  } else if (valid) {
    return `${style.warn()} ${style.warning('Valid with warnings')} (${warningCount} warning${warningCount !== 1 ? 's' : ''})`;
  } else {
    return `${style.cross()} ${style.error('Invalid')} (${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warningCount} warning${warningCount !== 1 ? 's' : ''})`;
  }
}

/**
 * Format a table
 */
export interface TableColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
}

export function formatTable(columns: TableColumn[], rows: Record<string, string>[]): string {
  if (rows.length === 0) return '';

  // Calculate column widths
  const widths = columns.map(col => {
    if (col.width) return col.width;

    const headerLen = stripAnsi(col.header).length;
    const maxDataLen = Math.max(...rows.map(row => stripAnsi(row[col.key] || '').length));
    return Math.max(headerLen, maxDataLen);
  });

  // Build header
  const headerRow = columns.map((col, i) => padString(col.header, widths[i], col.align)).join('  ');
  const separator = widths.map(w => '─'.repeat(w)).join('──');

  // Build data rows
  const dataRows = rows.map(row =>
    columns.map((col, i) => padString(row[col.key] || '', widths[i], col.align)).join('  ')
  );

  return [
    style.bold(headerRow),
    style.dim(separator),
    ...dataRows
  ].join('\n');
}

/**
 * Strip ANSI codes for length calculation
 */
export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Pad string to width
 */
function padString(str: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
  const len = stripAnsi(str).length;
  const pad = width - len;

  if (pad <= 0) return str;

  switch (align) {
    case 'right':
      return ' '.repeat(pad) + str;
    case 'center':
      const left = Math.floor(pad / 2);
      const right = pad - left;
      return ' '.repeat(left) + str + ' '.repeat(right);
    case 'left':
    default:
      return str + ' '.repeat(pad);
  }
}

/**
 * Format a section header
 */
export function formatHeader(title: string): string {
  return style.bold(title);
}

/**
 * Format a key-value pair
 */
export function formatKeyValue(key: string, value: string, indent: number = 0): string {
  const prefix = ' '.repeat(indent);
  return `${prefix}${style.dim(key + ':')} ${value}`;
}

/**
 * Format a list item
 */
export function formatListItem(text: string, indent: number = 0): string {
  const prefix = ' '.repeat(indent);
  return `${prefix}${style.bullet()} ${text}`;
}

/**
 * Format next action suggestion
 * Matches /m-status output format
 */
export function formatNextAction(phase: ManifoldPhase, feature: string): string {
  switch (phase) {
    case 'INITIALIZED':
      return `/m1-constrain ${feature}`;
    case 'CONSTRAINED':
      return `/m2-tension ${feature}`;
    case 'TENSIONED':
      return `/m3-anchor ${feature}`;
    case 'ANCHORED':
      return `/m4-generate ${feature}`;
    case 'GENERATED':
      return `/m5-verify ${feature}`;
    case 'VERIFIED':
      return 'Complete!';
    default:
      return `/m-status ${feature}`;
  }
}

/**
 * JSON output helpers
 * Satisfies: U3 (--json flag for machine-readable output)
 */
export function toJSON<T>(data: T): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Print line to stdout
 */
export function println(text: string = ''): void {
  console.log(text);
}

/**
 * Print error to stderr
 * Satisfies: U2 (Error messages with actionable next steps)
 */
export function printError(message: string, suggestion?: string): void {
  console.error(`${style.cross()} ${style.error('Error:')} ${message}`);
  if (suggestion) {
    console.error(`  ${style.arrow()} ${suggestion}`);
  }
}

/**
 * Print warning to stderr
 */
export function printWarning(message: string, suggestion?: string): void {
  console.error(`${style.warn()} ${style.warning('Warning:')} ${message}`);
  if (suggestion) {
    console.error(`  ${style.arrow()} ${suggestion}`);
  }
}
