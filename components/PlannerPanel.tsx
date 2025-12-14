import React, { useState } from 'react';
import { CheckCircle2, Circle, Play, Clock, AlertCircle, Loader2, X, Check } from 'lucide-react';
import { Plan, Task, updateTaskStatus, getReadyTasks, getPlanProgress, isPlanComplete } from '@/lib/agenticPlanner';
import clsx from 'clsx';

interface PlannerPanelProps {
  plan: Plan | null;
  onPlanUpdate?: (plan: Plan) => void;
  onStartGeneration?: () => void;
  onClose?: () => void;
  className?: string;
  isLoading?: boolean;
}

const PlannerPanel: React.FC<PlannerPanelProps> = ({
  plan,
  onPlanUpdate,
  onStartGeneration,
  onClose,
  className,
  isLoading = false,
}) => {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  if (isLoading || !plan) {
    return (
      <div className={clsx("flex flex-col items-center justify-center p-6 text-gray-400", className)}>
        <Loader2 size={32} className="animate-spin text-purple-400 mb-4" />
        <p className="text-sm">Generating build plan...</p>
        <p className="text-xs text-gray-500 mt-2">This may take a few seconds</p>
      </div>
    );
  }

  const progress = getPlanProgress(plan);
  const readyTasks = getReadyTasks(plan);
  const isComplete = isPlanComplete(plan);

  const toggleTaskExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const handleTaskStatusChange = (taskId: string, newStatus: Task['status']) => {
    if (onPlanUpdate) {
      const updatedPlan = updateTaskStatus(plan, taskId, newStatus);
      onPlanUpdate(updatedPlan);
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={16} className="text-green-400" />;
      case 'in-progress':
        return <Loader2 size={16} className="text-blue-400 animate-spin" />;
      case 'skipped':
        return <X size={16} className="text-gray-500" />;
      default:
        return <Circle size={16} className="text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getCategoryColor = (category: Task['category']) => {
    const colors = {
      setup: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      component: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      styling: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
      logic: 'bg-green-500/10 text-green-400 border-green-500/30',
      testing: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      deployment: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    };
    return colors[category] || colors.setup;
  };

  return (
    <div className={clsx("flex flex-col h-full bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#111] shrink-0">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white mb-1">Build Plan</h3>
          <p className="text-xs text-gray-400 line-clamp-1">{plan.prompt}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="p-4 border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400">Progress</span>
          <span className="text-xs font-semibold text-white">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {isComplete && (
          <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
            <Check size={14} />
            <span>Plan complete! Ready to generate.</span>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {plan.tasks.map((task) => {
          const isExpanded = expandedTasks.has(task.id);
          const canStart = readyTasks.some((t) => t.id === task.id);
          const hasDependencies = task.dependencies.length > 0;

          return (
            <div
              key={task.id}
              className={clsx(
                "p-3 rounded-lg border transition-all",
                task.status === 'completed'
                  ? "bg-green-500/10 border-green-500/30"
                  : task.status === 'in-progress'
                  ? "bg-blue-500/10 border-blue-500/30"
                  : "bg-white/5 border-white/10"
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => {
                    if (task.status === 'pending' && canStart) {
                      handleTaskStatusChange(task.id, 'in-progress');
                    } else if (task.status === 'in-progress') {
                      handleTaskStatusChange(task.id, 'completed');
                    } else if (task.status === 'completed') {
                      handleTaskStatusChange(task.id, 'pending');
                    }
                  }}
                  className="shrink-0 mt-0.5"
                  disabled={!canStart && task.status === 'pending'}
                >
                  {getStatusIcon(task.status)}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-medium text-white flex-1">
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.estimatedTime && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={12} />
                          {task.estimatedTime}m
                        </span>
                      )}
                      <span
                        className={clsx(
                          "px-2 py-0.5 rounded text-xs font-medium border",
                          getPriorityColor(task.priority)
                        )}
                      >
                        {task.priority}
                      </span>
                      <span
                        className={clsx(
                          "px-2 py-0.5 rounded text-xs font-medium border",
                          getCategoryColor(task.category)
                        )}
                      >
                        {task.category}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <p className="text-xs text-gray-400 mt-2 mb-2">
                      {task.description}
                    </p>
                  )}

                  {hasDependencies && (
                    <div className="mt-2 text-xs text-gray-500">
                      Depends on: {task.dependencies.length} task(s)
                    </div>
                  )}

                  {!canStart && task.status === 'pending' && hasDependencies && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-400">
                      <AlertCircle size={12} />
                      <span>Waiting for dependencies...</span>
                    </div>
                  )}

                  <button
                    onClick={() => toggleTaskExpanded(task.id)}
                    className="mt-2 text-xs text-purple-400 hover:text-purple-300"
                  >
                    {isExpanded ? 'Show less' : 'Show details'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 bg-[#111] shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-400">
            <span className="font-medium text-white">{plan.tasks.length}</span> tasks
            {plan.estimatedTotalTime > 0 && (
              <>
                {' • '}
                <span className="font-medium text-white">{plan.estimatedTotalTime}</span> min estimated
              </>
            )}
          </div>
          {onStartGeneration && (
            <button
              onClick={onStartGeneration}
              disabled={!isComplete}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                isComplete
                  ? "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white"
                  : "bg-white/5 text-gray-500 cursor-not-allowed"
              )}
            >
              <Play size={14} />
              Start Generation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlannerPanel;
