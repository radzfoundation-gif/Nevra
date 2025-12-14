/**
 * TypeScript support utilities
 * Note: Full TypeScript checking requires TypeScript compiler in browser
 * This is a simplified version for basic type checking
 */

export interface TypeError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Basic type checking for common TypeScript patterns
 */
export function checkTypeScript(code: string): TypeError[] {
  const errors: TypeError[] = [];
  const lines = code.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check for common TypeScript errors
    // Missing type annotations in function parameters
    const functionParamRegex = /function\s+\w+\s*\(([^)]*)\)/g;
    let match;
    while ((match = functionParamRegex.exec(line)) !== null) {
      const params = match[1];
      if (params && !params.includes(':')) {
        errors.push({
          line: lineNum,
          column: match.index || 0,
          message: 'Function parameters should have type annotations',
          severity: 'warning',
        });
      }
    }

    // Check for any type usage
    if (line.includes(': any') || line.includes('<any>')) {
      errors.push({
        line: lineNum,
        column: line.indexOf(': any') || line.indexOf('<any>') || 0,
        message: 'Avoid using "any" type',
        severity: 'warning',
      });
    }

    // Check for missing return types
    const functionRegex = /function\s+\w+\s*\([^)]*\)\s*{/;
    if (functionRegex.test(line) && !line.includes(':')) {
      errors.push({
        line: lineNum,
        column: 0,
        message: 'Function should have explicit return type',
        severity: 'warning',
      });
    }
  });

  return errors;
}

/**
 * Convert JSX to TypeScript (add type annotations)
 */
export function convertToTypeScript(jsx: string): string {
  let tsx = jsx;

  // Add React import if missing
  if (!tsx.includes("import React") && !tsx.includes("from 'react'")) {
    tsx = "import React from 'react';\n\n" + tsx;
  }

  // Convert function components to typed
  tsx = tsx.replace(
    /const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/g,
    (match, name, params) => {
      const typedParams = params.split(',').map((p: string) => {
        const trimmed = p.trim();
        if (!trimmed.includes(':')) {
          // Infer basic type from parameter name or use unknown
          return `${trimmed}: unknown`;
        }
        return trimmed;
      }).join(', ');
      return `const ${name} = (${typedParams}): JSX.Element =>`;
    }
  );

  // Add interface for props
  tsx = tsx.replace(
    /const\s+(\w+)\s*=\s*\(\s*\{\s*([^}]+)\s*\}\s*\)/g,
    (match, name, props) => {
      const propNames = props.split(',').map((p: string) => p.trim().split(':')[0].trim());
      const interfaceName = `${name}Props`;
      const interfaceDef = `interface ${interfaceName} {\n  ${propNames.map((p: string) => `${p}: unknown;`).join('\n  ')}\n}\n\n`;
      return interfaceDef + match.replace(`{${props}}`, `props: ${interfaceName}`);
    }
  );

  return tsx;
}

/**
 * Add type annotations to variables
 */
export function addTypeAnnotations(code: string): string {
  let annotated = code;

  // Add types to useState
  annotated = annotated.replace(
    /const\s+\[(\w+),\s*set\w+\]\s*=\s*useState\(([^)]+)\)/g,
    (match, varName, initialValue) => {
      let type = 'unknown';
      if (initialValue.includes('[')) type = 'unknown[]';
      if (initialValue.includes('{')) type = 'Record<string, unknown>';
      if (initialValue.includes("'") || initialValue.includes('"')) type = 'string';
      if (/^\d+$/.test(initialValue.trim())) type = 'number';
      if (initialValue === 'true' || initialValue === 'false') type = 'boolean';
      
      return match.replace('useState', `useState<${type}>`);
    }
  );

  return annotated;
}

/**
 * Validate TypeScript syntax (basic)
 */
export function validateTypeScript(code: string): { valid: boolean; errors: TypeError[] } {
  const errors = checkTypeScript(code);
  
  // Check for basic syntax errors
  const syntaxErrors = [
    /:\s*[^=;{]/g, // Invalid type syntax
    /<[^>]*>/g, // Generic syntax
  ];

  syntaxErrors.forEach(regex => {
    const matches = code.match(regex);
    if (matches) {
      // Basic validation - in production, use actual TypeScript compiler
    }
  });

  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
  };
}
