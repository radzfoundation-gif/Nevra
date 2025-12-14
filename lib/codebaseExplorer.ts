import { ProjectFile } from './fileManager';

export interface ExploredComponent {
  name: string;
  path: string;
  type: 'component' | 'page' | 'style' | 'config' | 'other';
  summary: string;
  exports?: string[];
  imports?: string[];
  dependencies?: string[];
}

export interface CodebaseAnalysis {
  components: ExploredComponent[];
  totalFiles: number;
  frameworks: string[];
  libraries: string[];
  structure: {
    components: string[];
    pages: string[];
    styles: string[];
    config: string[];
  };
}

/**
 * Analyze and explore existing codebase files
 * Similar to v0.app's "Exploring codebase" feature
 */
export class CodebaseExplorer {
  /**
   * Analyze existing files to extract component information
   */
  static analyzeCodebase(files: ProjectFile[]): CodebaseAnalysis {
    const components: ExploredComponent[] = [];
    const frameworks: Set<string> = new Set();
    const libraries: Set<string> = new Set();
    const structure = {
      components: [] as string[],
      pages: [] as string[],
      styles: [] as string[],
      config: [] as string[],
    };

    files.forEach((file) => {
      // Extract component info
      const component = this.extractComponentInfo(file);
      if (component) {
        components.push(component);
      }

      // Categorize files
      if (file.type === 'component') {
        structure.components.push(file.path);
      } else if (file.type === 'page') {
        structure.pages.push(file.path);
      } else if (file.type === 'style') {
        structure.styles.push(file.path);
      } else if (file.type === 'config') {
        structure.config.push(file.path);
      }

      // Detect frameworks and libraries
      this.detectFrameworks(file.content, frameworks);
      this.detectLibraries(file.content, libraries);
    });

    return {
      components,
      totalFiles: files.length,
      frameworks: Array.from(frameworks),
      libraries: Array.from(libraries),
      structure,
    };
  }

  /**
   * Extract component information from file content
   */
  private static extractComponentInfo(file: ProjectFile): ExploredComponent | null {
    if (!file.content || typeof file.content !== 'string') {
      return null;
    }

    const content = file.content;
    const fileName = file.path.split('/').pop() || file.path;
    const baseName = fileName.replace(/\.(tsx|ts|jsx|js)$/, '');

    // Extract component name
    let componentName = baseName;
    
    // Try to find exported component name
    const exportPatterns = [
      /export\s+default\s+(?:function\s+|const\s+)?(\w+)/,
      /export\s+(?:function\s+|const\s+)(\w+)/,
      /const\s+(\w+)\s*=\s*(?:\(|function)/,
      /function\s+(\w+)\s*\(/,
    ];

    for (const pattern of exportPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        componentName = match[1];
        break;
      }
    }

    // Extract imports
    const imports: string[] = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Extract exports
    const exports: string[] = [];
    const exportRegex = /export\s+(?:default\s+)?(?:function\s+|const\s+|class\s+)?(\w+)/g;
    while ((match = exportRegex.exec(content)) !== null) {
      if (match[1]) exports.push(match[1]);
    }

    // Extract dependencies (imports from local files)
    const dependencies: string[] = [];
    imports.forEach((imp) => {
      if (imp.startsWith('./') || imp.startsWith('../') || imp.startsWith('@/')) {
        dependencies.push(imp);
      }
    });

    // Generate summary (first few lines of code or comment)
    let summary = '';
    const lines = content.split('\n').slice(0, 5);
    const commentMatch = content.match(/\/\*\*[\s\S]*?\*\//) || content.match(/\/\/\s*(.+)/);
    if (commentMatch) {
      summary = commentMatch[0].replace(/\/\*\*|\*\//g, '').replace(/\/\/\s*/g, '').trim();
    } else {
      summary = lines.join(' ').substring(0, 100) + '...';
    }

    return {
      name: componentName,
      path: file.path,
      type: file.type,
      summary: summary || `Component: ${componentName}`,
      exports: exports.length > 0 ? exports : undefined,
      imports: imports.length > 0 ? imports.slice(0, 5) : undefined, // Limit to first 5
      dependencies: dependencies.length > 0 ? dependencies : undefined,
    };
  }

  /**
   * Detect frameworks from file content
   */
  private static detectFrameworks(content: string, frameworks: Set<string>): void {
    if (/from\s+['"]react['"]|import\s+React/.test(content)) {
      frameworks.add('react');
    }
    if (/from\s+['"]next\//.test(content) || /next\/config/.test(content)) {
      frameworks.add('nextjs');
    }
    if (/@vitejs\/plugin-react/.test(content) || /vite/.test(content)) {
      frameworks.add('vite');
    }
    if (/@remix-run/.test(content)) {
      frameworks.add('remix');
    }
    if (/vue/.test(content)) {
      frameworks.add('vue');
    }
  }

  /**
   * Detect libraries from file content
   */
  private static detectLibraries(content: string, libraries: Set<string>): void {
    const libraryPatterns = [
      { pattern: /framer-motion|motion\./, name: 'framer-motion' },
      { pattern: /tailwindcss|@apply/, name: 'tailwindcss' },
      { pattern: /lucide-react/, name: 'lucide-react' },
      { pattern: /@tanstack\/react-query/, name: '@tanstack/react-query' },
      { pattern: /zustand/, name: 'zustand' },
      { pattern: /recoil/, name: 'recoil' },
      { pattern: /redux/, name: 'redux' },
      { pattern: /react-router/, name: 'react-router' },
      { pattern: /axios|fetch/, name: 'http-client' },
    ];

    libraryPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(content)) {
        libraries.add(name);
      }
    });
  }

  /**
   * Generate context summary for AI prompt
   */
  static generateContextSummary(analysis: CodebaseAnalysis): string {
    const parts: string[] = [];

    if (analysis.totalFiles > 0) {
      parts.push(`\n## 📁 Existing Codebase (${analysis.totalFiles} files)`);
      
      if (analysis.frameworks.length > 0) {
        parts.push(`**Frameworks:** ${analysis.frameworks.join(', ')}`);
      }
      
      if (analysis.libraries.length > 0) {
        parts.push(`**Libraries:** ${analysis.libraries.join(', ')}`);
      }

      if (analysis.components.length > 0) {
        parts.push(`\n**Available Components (${analysis.components.length}):**`);
        analysis.components.forEach((comp) => {
          parts.push(`- \`${comp.name}\` (${comp.path}): ${comp.summary}`);
          if (comp.exports && comp.exports.length > 0) {
            parts.push(`  - Exports: ${comp.exports.join(', ')}`);
          }
        });
      }

      if (analysis.structure.components.length > 0) {
        parts.push(`\n**Component Files:** ${analysis.structure.components.join(', ')}`);
      }
      
      if (analysis.structure.pages.length > 0) {
        parts.push(`**Page Files:** ${analysis.structure.pages.join(', ')}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Generate exploration message for UI display
   */
  static generateExplorationMessage(analysis: CodebaseAnalysis): string {
    if (analysis.totalFiles === 0) {
      return 'No existing codebase to explore. Starting fresh project.';
    }

    const componentNames = analysis.components.map(c => c.name).slice(0, 10);
    const message = `Exploring codebase: Found ${analysis.totalFiles} files, ${analysis.components.length} components`;
    
    return message;
  }
}
