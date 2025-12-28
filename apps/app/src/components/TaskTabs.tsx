/**
 * TaskTabs - 任务标签栏组件
 */

import { X, Plus } from 'lucide-react';
import { Button } from './ui/button';

interface Task {
  id: string;
  name: string;
  isLoading: boolean;
}

interface TaskTabsProps {
  tasks: Task[];
  activeTaskId: string | null;
  onSwitch: (taskId: string) => void;
  onClose: (taskId: string) => void;
  onCreate: () => void;
}

export function TaskTabs({ tasks, activeTaskId, onSwitch, onClose, onCreate }: TaskTabsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto bg-background border-b px-2 py-1">
      {tasks.map(task => (
        <div
          key={task.id}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-t border-b-2 cursor-pointer transition-colors ${
            task.id === activeTaskId
              ? 'bg-muted border-primary'
              : 'border-transparent hover:bg-muted/50'
          }`}
          onClick={() => onSwitch(task.id)}
        >
          {task.isLoading && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
          <span className="text-sm truncate max-w-[120px]">{task.name}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(task.id);
            }}
            className="hover:bg-muted-foreground/20 rounded p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={onCreate} className="h-8 w-8 p-0">
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}
