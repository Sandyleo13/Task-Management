
"use client";

import type React from 'react';
import { TaskCard } from '@/components/task-card';
import type { Task } from '@/types/task';
import { AlertTriangle } from 'lucide-react'; // Icon for empty state

interface TaskListProps {
  tasks: Task[];
  onUpdateTask: (updatedTask: Task) => void;
  onDeleteTask: (taskId: string) => void;
  allTaskIds: string[]; // Pass allTaskIds for dependency editing in TaskCard -> TaskFormDialog
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onUpdateTask, onDeleteTask, allTaskIds }) => {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-muted-foreground mt-12 p-6 border border-dashed rounded-lg">
        <AlertTriangle className="h-10 w-10 mb-3 text-orange-400" />
        <p className="text-lg font-medium">No tasks found.</p>
        <p className="text-sm">Try adjusting your search or filters, or create a new task!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3"> {/* Slightly reduced spacing */}
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          allTaskIds={allTaskIds} // Pass allTaskIds down
        />
      ))}
    </div>
  );
};
