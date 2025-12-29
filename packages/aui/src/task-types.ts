export type TaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  runner?: string;
  parentId?: string;
  childIds: string[];
}

export interface Tool {
  id: string;
  name: string;
  params: Array<{ name: string; type: string; required?: boolean }>;
  execute: (params: Record<string, any>) => void | Promise<void>;
}
