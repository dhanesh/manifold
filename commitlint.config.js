/**
 * Commitlint Configuration
 * Satisfies: T1 (Conventional Commits format), U1 (immediate feedback)
 *
 * Enforces Conventional Commits specification:
 * - type(scope): description
 * - feat: new feature (MINOR bump)
 * - fix: bug fix (PATCH bump)
 * - BREAKING CHANGE: breaking change (MAJOR bump)
 */

export default {
  extends: ['@commitlint/config-conventional'],

  rules: {
    // Satisfies: T1 - Commits must follow Conventional Commits format
    'type-enum': [
      2, // Error level
      'always',
      [
        'feat',     // New feature (MINOR)
        'fix',      // Bug fix (PATCH)
        'docs',     // Documentation only
        'style',    // Formatting, no code change
        'refactor', // Code change, no feature/fix
        'perf',     // Performance improvement
        'test',     // Adding tests
        'build',    // Build system changes
        'ci',       // CI configuration
        'chore',    // Maintenance tasks
        'revert'    // Reverting commits
      ]
    ],

    // Satisfies: B4 - Releases traceable to commits
    'subject-empty': [2, 'never'],
    'type-empty': [2, 'never'],

    // Satisfies: U2 - Human-readable changelog
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 100],

    // Satisfies: B3 - Breaking changes must be explicit
    'footer-max-line-length': [0, 'always'], // Allow long BREAKING CHANGE footers
  },

  // Help text shown on validation failure
  helpUrl: 'https://www.conventionalcommits.org/en/v1.0.0/'
};
