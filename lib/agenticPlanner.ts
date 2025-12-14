/**
 * Agentic Planning for NEVRA Builder
 * AI creates a plan before generating code, similar to v0.app
 */

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  dependencies: string[]; // IDs of tasks that must complete first
  estimatedTime?: number; // in minutes
  priority: 'low' | 'medium' | 'high';
  category: 'setup' | 'component' | 'styling' | 'logic' | 'testing' | 'deployment';
}

export interface Plan {
  id: string;
  prompt: string;
  tasks: Task[];
  estimatedTotalTime: number;
  createdAt: Date;
  updatedAt: Date;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Generate a plan from user prompt with timeout
 */
export async function generatePlan(
  prompt: string,
  provider: 'anthropic' | 'gemini' | 'openai' | 'deepseek' = 'deepseek' // Default to Mistral Devstral
): Promise<Plan> {
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(`${API_BASE}/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        provider,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Planning failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.id || Date.now().toString(),
      prompt: data.prompt || prompt,
      tasks: data.tasks || [],
      estimatedTotalTime: data.estimatedTotalTime || 0,
      createdAt: new Date(data.createdAt || Date.now()),
      updatedAt: new Date(data.updatedAt || Date.now()),
    };
  } catch (error: any) {
    console.error('Planning error:', error);
    
    // If timeout or network error, use fallback immediately
    if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('network')) {
      console.warn('Planning timeout, using fallback plan');
      return createFallbackPlan(prompt);
    }
    
    // Return a basic plan as fallback for any error
    return createFallbackPlan(prompt);
  }
}

/**
 * Create a fallback plan if AI planning fails
 */
export function createFallbackPlan(prompt: string): Plan {
  const tasks: Task[] = [
    {
      id: '1',
      title: 'Analyze Requirements',
      description: 'Understand the user requirements and break down the project',
      status: 'completed',
      dependencies: [],
      priority: 'high',
      category: 'setup',
    },
    {
      id: '2',
      title: 'Design Architecture',
      description: 'Plan the component structure and data flow',
      status: 'pending',
      dependencies: ['1'],
      priority: 'high',
      category: 'setup',
    },
    {
      id: '3',
      title: 'Generate Components',
      description: 'Create React components based on the design',
      status: 'pending',
      dependencies: ['2'],
      priority: 'high',
      category: 'component',
    },
    {
      id: '4',
      title: 'Apply Styling',
      description: 'Add TailwindCSS classes and custom styles',
      status: 'pending',
      dependencies: ['3'],
      priority: 'medium',
      category: 'styling',
    },
    {
      id: '5',
      title: 'Implement Logic',
      description: 'Add interactivity and state management',
      status: 'pending',
      dependencies: ['3'],
      priority: 'medium',
      category: 'logic',
    },
    {
      id: '6',
      title: 'Test & Refine',
      description: 'Test the application and fix any issues',
      status: 'pending',
      dependencies: ['4', '5'],
      priority: 'low',
      category: 'testing',
    },
  ];

  return {
    id: Date.now().toString(),
    prompt,
    tasks,
    estimatedTotalTime: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Update task status
 */
export function updateTaskStatus(
  plan: Plan,
  taskId: string,
  status: Task['status']
): Plan {
  return {
    ...plan,
    tasks: plan.tasks.map((task) =>
      task.id === taskId ? { ...task, status } : task
    ),
    updatedAt: new Date(),
  };
}

/**
 * Get tasks that are ready to start (dependencies completed)
 */
export function getReadyTasks(plan: Plan): Task[] {
  const completedTaskIds = plan.tasks
    .filter((t) => t.status === 'completed')
    .map((t) => t.id);

  return plan.tasks.filter(
    (task) =>
      task.status === 'pending' &&
      task.dependencies.every((depId) => completedTaskIds.includes(depId))
  );
}

/**
 * Get progress percentage
 */
export function getPlanProgress(plan: Plan): number {
  if (plan.tasks.length === 0) return 0;
  const completed = plan.tasks.filter((t) => t.status === 'completed').length;
  return Math.round((completed / plan.tasks.length) * 100);
}

/**
 * Check if plan is complete
 */
export function isPlanComplete(plan: Plan): boolean {
  return plan.tasks.every((task) => 
    task.status === 'completed' || task.status === 'skipped'
  );
}

/**
 * Get tasks by category
 */
export function getTasksByCategory(plan: Plan, category: Task['category']): Task[] {
  return plan.tasks.filter((task) => task.category === category);
}

/**
 * Get critical path (tasks that block others)
 */
export function getCriticalPath(plan: Plan): Task[] {
  // Simple implementation: tasks with high priority and dependencies
  return plan.tasks.filter(
    (task) => task.priority === 'high' && task.dependencies.length > 0
  );
}
