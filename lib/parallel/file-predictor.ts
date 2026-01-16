/**
 * File Predictor
 * Satisfies: T3 (file overlap detection), T4 (implicit dependencies), T6 (file-level parallelization)
 * Required Truths: RT-2 (Independent tasks can be identified - no file overlap)
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';

export interface FilePrediction {
  taskId: string;
  predictedFiles: string[];
  confidence: number;  // 0-1
  method: PredictionMethod;
  reasoning?: string;
}

export type PredictionMethod =
  | 'explicit'        // Files explicitly mentioned
  | 'pattern'         // Pattern matching (e.g., "all *.test.ts")
  | 'module'          // Module-based inference
  | 'git_history'     // Based on git history patterns
  | 'ast_analysis'    // Deep AST analysis (future)
  | 'heuristic';      // General heuristics

export interface PredictorConfig {
  baseDir: string;
  useGitHistory?: boolean;
  historyDepth?: number;
  includeTests?: boolean;
  includeRelated?: boolean;
}

const DEFAULT_CONFIG: Omit<PredictorConfig, 'baseDir'> = {
  useGitHistory: true,
  historyDepth: 50,
  includeTests: true,
  includeRelated: true,
};

/**
 * Predicts which files a task will modify
 * Satisfies: RT-2 (Independent tasks can be identified - no file overlap)
 */
export class FilePredictor {
  private config: Required<PredictorConfig>;
  private fileCache: Map<string, string[]> = new Map();
  private gitPatterns: Map<string, string[]> = new Map();

  constructor(config: PredictorConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as Required<PredictorConfig>;

    if (this.config.useGitHistory) {
      this.loadGitPatterns();
    }
  }

  /**
   * Predict files for a single task
   * Satisfies: T4 (Dependency analysis should detect implicit dependencies)
   */
  predict(taskId: string, description: string): FilePrediction {
    const predictions: Array<{ files: string[]; confidence: number; method: PredictionMethod }> = [];

    // Method 1: Explicit file mentions (highest confidence)
    const explicitFiles = this.extractExplicitFiles(description);
    if (explicitFiles.length > 0) {
      predictions.push({
        files: explicitFiles,
        confidence: 0.95,
        method: 'explicit',
      });
    }

    // Method 2: Pattern matching
    const patternFiles = this.matchPatterns(description);
    if (patternFiles.length > 0) {
      predictions.push({
        files: patternFiles,
        confidence: 0.8,
        method: 'pattern',
      });
    }

    // Method 3: Module inference
    const moduleFiles = this.inferModuleFiles(description);
    if (moduleFiles.length > 0) {
      predictions.push({
        files: moduleFiles,
        confidence: 0.7,
        method: 'module',
      });
    }

    // Method 4: Git history patterns
    if (this.config.useGitHistory) {
      const historyFiles = this.predictFromHistory(description);
      if (historyFiles.length > 0) {
        predictions.push({
          files: historyFiles,
          confidence: 0.6,
          method: 'git_history',
        });
      }
    }

    // Method 5: Heuristics
    const heuristicFiles = this.applyHeuristics(description);
    if (heuristicFiles.length > 0) {
      predictions.push({
        files: heuristicFiles,
        confidence: 0.5,
        method: 'heuristic',
      });
    }

    // Combine predictions, preferring higher confidence
    const combined = this.combinePredictions(predictions);

    return {
      taskId,
      predictedFiles: combined.files,
      confidence: combined.confidence,
      method: combined.method,
      reasoning: this.generateReasoning(predictions),
    };
  }

  /**
   * Predict files for multiple tasks
   */
  predictAll(tasks: Array<{ id: string; description: string }>): FilePrediction[] {
    return tasks.map(task => this.predict(task.id, task.description));
  }

  /**
   * Extract explicitly mentioned files from description
   */
  private extractExplicitFiles(description: string): string[] {
    const files: string[] = [];

    // Match file paths with common extensions
    const fileRegex = /[\w\-./]+\.(ts|tsx|js|jsx|json|yaml|yml|md|css|scss|html)/gi;
    const matches = description.match(fileRegex) || [];

    for (const match of matches) {
      const fullPath = join(this.config.baseDir, match);
      if (existsSync(fullPath)) {
        files.push(match);
      } else {
        // Try to find similar files
        const similar = this.findSimilarFiles(match);
        files.push(...similar);
      }
    }

    // Add related files if configured
    if (this.config.includeRelated) {
      files.push(...this.findRelatedFiles(files));
    }

    return [...new Set(files)];
  }

  /**
   * Match patterns like "all test files" or "components/*"
   */
  private matchPatterns(description: string): string[] {
    const files: string[] = [];
    const lowerDesc = description.toLowerCase();

    // Pattern: "all/every <type> files"
    if (lowerDesc.includes('all test') || lowerDesc.includes('every test')) {
      files.push(...this.findFilesByPattern('**/*.test.{ts,tsx,js,jsx}'));
    }

    if (lowerDesc.includes('all component') || lowerDesc.includes('every component')) {
      files.push(...this.findFilesByPattern('**/components/**/*.{ts,tsx}'));
    }

    // Pattern: directory mentions
    const dirMatch = description.match(/(?:in|under|within)\s+([\w\-./]+)(?:\s+directory)?/i);
    if (dirMatch) {
      files.push(...this.findFilesByPattern(`${dirMatch[1]}/**/*`));
    }

    return [...new Set(files)];
  }

  /**
   * Infer files from module/component names
   * Satisfies: T6 (Support both file-level and module-level parallelization)
   */
  private inferModuleFiles(description: string): string[] {
    const files: string[] = [];

    // Extract potential module names (PascalCase or camelCase identifiers)
    const moduleRegex = /\b([A-Z][a-zA-Z0-9]+(?:Service|Component|Controller|Manager|Handler|Provider|Module|Store|Reducer|Action|Hook)?)\b/g;
    const matches = [...description.matchAll(moduleRegex)];

    for (const match of matches) {
      const moduleName = match[1];

      // Try various naming conventions
      const variants = [
        moduleName,
        this.toKebabCase(moduleName),
        this.toCamelCase(moduleName),
        this.toSnakeCase(moduleName),
      ];

      for (const variant of variants) {
        const found = this.findFilesByPattern(`**/${variant}.*`);
        files.push(...found);

        // Also check for index files in directories
        const indexFound = this.findFilesByPattern(`**/${variant}/index.*`);
        files.push(...indexFound);
      }
    }

    return [...new Set(files)];
  }

  /**
   * Predict files based on git history patterns
   */
  private predictFromHistory(description: string): string[] {
    const files: string[] = [];
    const keywords = this.extractKeywords(description);

    for (const keyword of keywords) {
      const pattern = this.gitPatterns.get(keyword.toLowerCase());
      if (pattern) {
        files.push(...pattern);
      }
    }

    return [...new Set(files)];
  }

  /**
   * Apply general heuristics
   */
  private applyHeuristics(description: string): string[] {
    const files: string[] = [];
    const lowerDesc = description.toLowerCase();

    // Heuristic: authentication → auth-related files
    if (lowerDesc.includes('auth') || lowerDesc.includes('login') || lowerDesc.includes('session')) {
      files.push(...this.findFilesByPattern('**/*auth*'));
      files.push(...this.findFilesByPattern('**/*login*'));
      files.push(...this.findFilesByPattern('**/*session*'));
    }

    // Heuristic: API/endpoint → route files
    if (lowerDesc.includes('api') || lowerDesc.includes('endpoint') || lowerDesc.includes('route')) {
      files.push(...this.findFilesByPattern('**/routes/**/*'));
      files.push(...this.findFilesByPattern('**/api/**/*'));
      files.push(...this.findFilesByPattern('**/*.route.*'));
    }

    // Heuristic: database → model/schema files
    if (lowerDesc.includes('database') || lowerDesc.includes('schema') || lowerDesc.includes('model')) {
      files.push(...this.findFilesByPattern('**/models/**/*'));
      files.push(...this.findFilesByPattern('**/schemas/**/*'));
      files.push(...this.findFilesByPattern('**/*.model.*'));
    }

    // Heuristic: UI/styling → component and style files
    if (lowerDesc.includes('style') || lowerDesc.includes('css') || lowerDesc.includes('ui')) {
      files.push(...this.findFilesByPattern('**/*.css'));
      files.push(...this.findFilesByPattern('**/*.scss'));
      files.push(...this.findFilesByPattern('**/styles/**/*'));
    }

    // Heuristic: config → configuration files
    if (lowerDesc.includes('config') || lowerDesc.includes('setting')) {
      files.push(...this.findFilesByPattern('**/*.config.*'));
      files.push(...this.findFilesByPattern('**/config/**/*'));
    }

    return [...new Set(files)];
  }

  /**
   * Combine multiple predictions
   */
  private combinePredictions(
    predictions: Array<{ files: string[]; confidence: number; method: PredictionMethod }>
  ): { files: string[]; confidence: number; method: PredictionMethod } {
    if (predictions.length === 0) {
      return { files: [], confidence: 0, method: 'heuristic' };
    }

    // Sort by confidence and take best
    predictions.sort((a, b) => b.confidence - a.confidence);
    const best = predictions[0];

    // Merge all unique files, weighted by confidence
    const allFiles = new Set<string>();
    for (const pred of predictions) {
      pred.files.forEach(f => allFiles.add(f));
    }

    return {
      files: Array.from(allFiles),
      confidence: best.confidence,
      method: best.method,
    };
  }

  /**
   * Load git history patterns
   */
  private loadGitPatterns(): void {
    try {
      const output = execSync(
        `git log --name-only --pretty=format:"COMMIT:%s" -${this.config.historyDepth}`,
        { cwd: this.config.baseDir, encoding: 'utf-8' }
      );

      let currentMessage = '';
      const commitFiles: Map<string, string[]> = new Map();

      for (const line of output.split('\n')) {
        if (line.startsWith('COMMIT:')) {
          currentMessage = line.slice(7).toLowerCase();
          if (!commitFiles.has(currentMessage)) {
            commitFiles.set(currentMessage, []);
          }
        } else if (line.trim() && currentMessage) {
          commitFiles.get(currentMessage)?.push(line.trim());
        }
      }

      // Extract keywords and map to files
      for (const [message, files] of commitFiles) {
        const keywords = this.extractKeywords(message);
        for (const keyword of keywords) {
          const existing = this.gitPatterns.get(keyword) || [];
          this.gitPatterns.set(keyword, [...new Set([...existing, ...files])]);
        }
      }
    } catch (error) {
      // Git history not available, skip
    }
  }

  /**
   * Find files matching a glob pattern
   */
  private findFilesByPattern(pattern: string): string[] {
    // Simple implementation - in production would use proper glob library
    try {
      const output = execSync(
        `find . -type f -path "${pattern.replace('**', '*')}" 2>/dev/null | head -20`,
        { cwd: this.config.baseDir, encoding: 'utf-8' }
      );

      return output
        .split('\n')
        .filter(Boolean)
        .map(f => f.replace(/^\.\//, ''));
    } catch {
      return [];
    }
  }

  /**
   * Find files similar to a given path
   */
  private findSimilarFiles(path: string): string[] {
    const name = basename(path, extname(path));
    return this.findFilesByPattern(`**/*${name}*`).slice(0, 5);
  }

  /**
   * Find related files (e.g., test files, type definitions)
   */
  private findRelatedFiles(files: string[]): string[] {
    const related: string[] = [];

    for (const file of files) {
      const ext = extname(file);
      const base = basename(file, ext);
      const dir = dirname(file);

      // Test files
      if (this.config.includeTests) {
        related.push(...this.findFilesByPattern(`${dir}/${base}.test${ext}`));
        related.push(...this.findFilesByPattern(`${dir}/__tests__/${base}${ext}`));
      }

      // Type definitions
      if (ext === '.ts' || ext === '.tsx') {
        related.push(...this.findFilesByPattern(`${dir}/${base}.d.ts`));
      }

      // Index files
      related.push(...this.findFilesByPattern(`${dir}/index${ext}`));
    }

    return related;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Remove common words and extract meaningful terms
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'ought', 'used', 'fix', 'add', 'update', 'remove', 'change', 'make',
    ]);

    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Generate reasoning string for predictions
   */
  private generateReasoning(
    predictions: Array<{ files: string[]; confidence: number; method: PredictionMethod }>
  ): string {
    if (predictions.length === 0) {
      return 'No files could be predicted for this task.';
    }

    const parts = predictions.map(p =>
      `${p.method}: ${p.files.length} files (${Math.round(p.confidence * 100)}% confidence)`
    );

    return `Predictions based on: ${parts.join(', ')}`;
  }

  // String conversion utilities
  private toKebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  private toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  private toSnakeCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  }
}

export default FilePredictor;
