
export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'backlog';

export interface Task {
  id: string;
  description: string;
  deadline: string; // ISO string format
  dependencies: string[]; // Array of task IDs
  priority?: number; // Optional numerical priority assigned manually or by AI
  status: TaskStatus;
  aiReason?: string; // Optional explanation from AI for the priority
}
