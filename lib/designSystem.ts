/**
 * Design System Manager for NEVRA Builder
 * Manages design tokens (colors, typography, spacing, effects) that can be reused across projects
 */

export interface ColorToken {
  name: string;
  value: string;
  description?: string;
}

export interface TypographyToken {
  fontFamily: string;
  fontSize: string;
  fontWeight: string | number;
  lineHeight: string | number;
  letterSpacing?: string;
}

export interface SpacingToken {
  name: string;
  value: string;
  description?: string;
}

export interface EffectToken {
  name: string;
  type: 'shadow' | 'blur' | 'gradient' | 'border';
  value: string;
  description?: string;
}

export interface DesignSystem {
  id: string;
  name: string;
  colors: {
    background: ColorToken[];
    primary: ColorToken[];
    secondary: ColorToken[];
    accent: ColorToken[];
    text: ColorToken[];
    border: ColorToken[];
  };
  typography: {
    headings: TypographyToken[];
    body: TypographyToken;
    code: TypographyToken;
  };
  spacing: SpacingToken[];
  effects: EffectToken[];
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Default Design System (v0.app / Bolt.new style)
export const DEFAULT_DESIGN_SYSTEM: DesignSystem = {
  id: 'default',
  name: 'Default (v0.app Style)',
  colors: {
    background: [
      { name: 'base', value: '#050505', description: 'Main background' },
      { name: 'elevated', value: '#0a0a0a', description: 'Elevated surfaces' },
      { name: 'overlay', value: '#1a1a1a', description: 'Overlay backgrounds' },
    ],
    primary: [
      { name: 'main', value: '#7e22ce', description: 'Primary purple' },
      { name: 'light', value: '#a855f7', description: 'Light purple' },
      { name: 'dark', value: '#6b21a8', description: 'Dark purple' },
    ],
    secondary: [
      { name: 'main', value: '#3b82f6', description: 'Primary blue' },
      { name: 'light', value: '#60a5fa', description: 'Light blue' },
      { name: 'dark', value: '#2563eb', description: 'Dark blue' },
    ],
    accent: [
      { name: 'success', value: '#10b981', description: 'Success green' },
      { name: 'warning', value: '#f59e0b', description: 'Warning orange' },
      { name: 'error', value: '#ef4444', description: 'Error red' },
    ],
    text: [
      { name: 'primary', value: '#ffffff', description: 'Primary text' },
      { name: 'secondary', value: '#e5e5e5', description: 'Secondary text' },
      { name: 'tertiary', value: '#a3a3a3', description: 'Tertiary text' },
      { name: 'muted', value: '#737373', description: 'Muted text' },
    ],
    border: [
      { name: 'default', value: 'rgba(255, 255, 255, 0.1)', description: 'Default border' },
      { name: 'strong', value: 'rgba(255, 255, 255, 0.2)', description: 'Strong border' },
      { name: 'subtle', value: 'rgba(255, 255, 255, 0.05)', description: 'Subtle border' },
    ],
  },
  typography: {
    headings: [
      {
        fontFamily: 'Inter, sans-serif',
        fontSize: '3rem',
        fontWeight: 800,
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
      },
      {
        fontFamily: 'Inter, sans-serif',
        fontSize: '2.25rem',
        fontWeight: 700,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
      },
      {
        fontFamily: 'Inter, sans-serif',
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
    ],
    body: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    code: {
      fontFamily: 'Monaco, "Courier New", monospace',
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
  },
  spacing: [
    { name: 'xs', value: '0.25rem', description: 'Extra small (4px)' },
    { name: 'sm', value: '0.5rem', description: 'Small (8px)' },
    { name: 'md', value: '1rem', description: 'Medium (16px)' },
    { name: 'lg', value: '1.5rem', description: 'Large (24px)' },
    { name: 'xl', value: '2rem', description: 'Extra large (32px)' },
    { name: '2xl', value: '3rem', description: '2X large (48px)' },
    { name: '3xl', value: '4rem', description: '3X large (64px)' },
  ],
  effects: [
    { name: 'glassmorphism', type: 'blur', value: 'backdrop-blur-xl bg-white/5', description: 'Glass effect' },
    { name: 'shadow-lg', type: 'shadow', value: 'shadow-2xl', description: 'Large shadow' },
    { name: 'shadow-purple', type: 'shadow', value: 'shadow-purple-500/20', description: 'Purple glow shadow' },
    { name: 'gradient-primary', type: 'gradient', value: 'bg-gradient-to-br from-purple-500 to-blue-500', description: 'Primary gradient' },
    { name: 'border-subtle', type: 'border', value: 'border border-white/10', description: 'Subtle border' },
  ],
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

class DesignSystemManager {
  private systems: Map<string, DesignSystem> = new Map();
  private currentSystemId: string = 'default';

  constructor() {
    // Load default system
    this.systems.set('default', DEFAULT_DESIGN_SYSTEM);
    this.loadFromStorage();
  }

  /**
   * Get current design system
   */
  getCurrentSystem(): DesignSystem {
    return this.systems.get(this.currentSystemId) || DEFAULT_DESIGN_SYSTEM;
  }

  /**
   * Set current design system
   */
  setCurrentSystem(systemId: string): void {
    if (this.systems.has(systemId)) {
      this.currentSystemId = systemId;
      this.saveToStorage();
    }
  }

  /**
   * Create a new design system
   */
  createSystem(name: string, baseSystem?: DesignSystem): DesignSystem {
    const base = baseSystem || DEFAULT_DESIGN_SYSTEM;
    const newSystem: DesignSystem = {
      ...base,
      id: `system-${Date.now()}`,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.systems.set(newSystem.id, newSystem);
    this.saveToStorage();
    return newSystem;
  }

  /**
   * Update design system
   */
  updateSystem(systemId: string, updates: Partial<DesignSystem>): DesignSystem | null {
    const system = this.systems.get(systemId);
    if (!system) return null;

    const updated: DesignSystem = {
      ...system,
      ...updates,
      updatedAt: new Date(),
    };
    this.systems.set(systemId, updated);
    this.saveToStorage();
    return updated;
  }

  /**
   * Delete design system
   */
  deleteSystem(systemId: string): boolean {
    if (systemId === 'default') return false; // Can't delete default
    const deleted = this.systems.delete(systemId);
    if (deleted && this.currentSystemId === systemId) {
      this.currentSystemId = 'default';
    }
    this.saveToStorage();
    return deleted;
  }

  /**
   * Get all design systems
   */
  getAllSystems(): DesignSystem[] {
    return Array.from(this.systems.values());
  }

  /**
   * Get design system by ID
   */
  getSystem(systemId: string): DesignSystem | null {
    return this.systems.get(systemId) || null;
  }

  /**
   * Generate CSS variables from design system
   */
  generateCSSVariables(system: DesignSystem = this.getCurrentSystem()): string {
    const vars: string[] = [];

    // Colors
    Object.entries(system.colors).forEach(([category, tokens]) => {
      tokens.forEach((token) => {
        const varName = `--color-${category}-${token.name}`;
        vars.push(`  ${varName}: ${token.value};`);
      });
    });

    // Typography
    system.typography.headings.forEach((heading, index) => {
      vars.push(`  --font-heading-${index + 1}-family: ${heading.fontFamily};`);
      vars.push(`  --font-heading-${index + 1}-size: ${heading.fontSize};`);
      vars.push(`  --font-heading-${index + 1}-weight: ${heading.fontWeight};`);
      vars.push(`  --font-heading-${index + 1}-line-height: ${heading.lineHeight};`);
    });
    vars.push(`  --font-body-family: ${system.typography.body.fontFamily};`);
    vars.push(`  --font-body-size: ${system.typography.body.fontSize};`);
    vars.push(`  --font-body-weight: ${system.typography.body.fontWeight};`);
    vars.push(`  --font-body-line-height: ${system.typography.body.lineHeight};`);

    // Spacing
    system.spacing.forEach((spacing) => {
      vars.push(`  --spacing-${spacing.name}: ${spacing.value};`);
    });

    // Border radius
    Object.entries(system.borderRadius).forEach(([size, value]) => {
      vars.push(`  --radius-${size}: ${value};`);
    });

    return `:root {\n${vars.join('\n')}\n}`;
  }

  /**
   * Generate Tailwind config from design system
   */
  generateTailwindConfig(system: DesignSystem = this.getCurrentSystem()): string {
    const colors: Record<string, Record<string, string>> = {};
    Object.entries(system.colors).forEach(([category, tokens]) => {
      colors[category] = {};
      tokens.forEach((token) => {
        colors[category][token.name] = token.value;
      });
    });

    return JSON.stringify(
      {
        theme: {
          extend: {
            colors,
            fontFamily: {
              sans: [system.typography.body.fontFamily],
              heading: [system.typography.headings[0]?.fontFamily || system.typography.body.fontFamily],
              code: [system.typography.code.fontFamily],
            },
            spacing: Object.fromEntries(
              system.spacing.map((s) => [s.name, s.value])
            ),
            borderRadius: system.borderRadius,
          },
        },
      },
      null,
      2
    );
  }

  /**
   * Apply design system to generated code
   */
  applyToCode(code: string, system: DesignSystem = this.getCurrentSystem()): string {
    // Inject CSS variables
    const cssVars = this.generateCSSVariables(system);
    
    // Check if code already has style tag
    if (code.includes('<style>')) {
      // Insert CSS variables at the beginning of style tag
      code = code.replace('<style>', `<style>\n${cssVars}\n`);
    } else if (code.includes('</head>')) {
      // Insert style tag before </head>
      code = code.replace('</head>', `<style>\n${cssVars}\n</style>\n</head>`);
    } else {
      // Add style tag at the beginning
      code = `<style>\n${cssVars}\n</style>\n${code}`;
    }

    return code;
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('nevra_design_systems');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.systems) {
          data.systems.forEach((sys: any) => {
            this.systems.set(sys.id, {
              ...sys,
              createdAt: new Date(sys.createdAt),
              updatedAt: new Date(sys.updatedAt),
            });
          });
        }
        if (data.currentSystemId) {
          this.currentSystemId = data.currentSystemId;
        }
      }
    } catch (error) {
      console.error('Failed to load design systems from storage:', error);
    }
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = {
        systems: Array.from(this.systems.values()),
        currentSystemId: this.currentSystemId,
      };
      localStorage.setItem('nevra_design_systems', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save design systems to storage:', error);
    }
  }
}

// Singleton instance
export const designSystemManager = new DesignSystemManager();
