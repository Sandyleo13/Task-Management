"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { TaskList } from "@/components/task-list";
import type { Task, TaskStatus } from '@/types/task';
import useLocalStorage from '@/hooks/use-local-storage';
import { prioritizeTasks, type PrioritizeTasksInput, type PrioritizeTasksOutput } from '@/ai/flows/prioritize-tasks';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Search, Filter, BrainCircuit, Loader2, Circle, Clock, CheckCircle, AlertCircle } from 'lucide-react'; // Added status icons
import { Separator } from '@/components/ui/separator';

// Define initial tasks (example data)
const initialTasks: Task[] = [
 { id: 'task-1', description: 'Setup project structure', deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), dependencies: [], status: 'done', priority: 1, aiReason: "Completed task, lowest priority." },
 { id: 'task-2', description: 'Implement UI components based on Figma designs', deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), dependencies: ['task-1'], status: 'in-progress', priority: 2, aiReason: "In progress, moderate priority." },
 { id: 'task-3', description: 'Connect frontend to backend user authentication API endpoints', deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), dependencies: ['task-2'], status: 'todo', priority: 3, aiReason: "Upcoming task, standard priority." },
 { id: 'task-4', description: 'Write unit tests for core task logic functions', deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), dependencies: ['task-3'], status: 'todo' }, // No priority initially
 { id: 'task-5', description: 'Configure CI/CD pipeline for automated deployment to staging', deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), dependencies: ['task-4'], status: 'backlog' }, // No priority initially
];

// Status options for filter dropdown
const statusFilterOptions: { value: TaskStatus | 'all'; label: string; icon?: React.ElementType }[] = [
  { value: 'all', label: 'All Statuses', icon: Filter },
  { value: 'todo', label: 'To Do', icon: Circle },
  { value: 'in-progress', label: 'In Progress', icon: Clock },
  { value: 'done', label: 'Done', icon: CheckCircle },
  { value: 'backlog', label: 'Backlog', icon: AlertCircle },
];

export default function Home() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', initialTasks);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const { toast } = useToast();

  // Hydration safety: Ensure client-side only operations run after mount
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Memoize all task IDs for efficient dependency selection
  const allTaskIds = useMemo(() => tasks.map(task => task.id), [tasks]);

  // Handlers using useCallback for potential performance optimization
  const handleAddTask = useCallback((newTask: Task) => {
    setTasks((prevTasks) => [...prevTasks, newTask]);
  }, [setTasks]);

  const handleUpdateTask = useCallback((updatedTask: Task) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
    setEditingTask(null); // Clear editing state after update
  }, [setTasks]);

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks((prevTasks) => {
      // Remove the task itself
      const newTasks = prevTasks.filter((task) => task.id !== taskId);
      // Remove the deleted task ID from other tasks' dependencies
      return newTasks.map(task => ({
        ...task,
        dependencies: task.dependencies.filter(depId => depId !== taskId)
      }));
    });
    toast({ title: "Task Deleted", description: "The task has been successfully removed.", variant: 'default' });
  }, [setTasks, toast]);

  const openEditDialog = useCallback((task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  }, []); // Depends only on setEditingTask and setIsFormOpen

  const handleDialogClose = useCallback(() => {
     setIsFormOpen(false);
     setEditingTask(null); // Ensure editing task is cleared when closing
  }, []); // Depends only on setIsFormOpen and setEditingTask


  const handleAiPrioritize = useCallback(async () => {
    if (!tasks || tasks.length === 0) {
      toast({ title: "No Tasks to Prioritize", description: "Please add some tasks before using AI prioritization.", variant: "destructive" });
      return;
    }
    setIsPrioritizing(true);
    try {
       // Prepare input for the AI flow, ensuring required fields are present
      const prioritizeInput: PrioritizeTasksInput = tasks.map(task => ({
        id: task.id,
        description: task.description,
        deadline: task.deadline || new Date().toISOString(), // Provide default if missing
        dependencies: task.dependencies || [],
      }));

      // Call the server action (Genkit flow)
      const prioritizedOutput: PrioritizeTasksOutput = await prioritizeTasks(prioritizeInput);

      // Update tasks with AI-suggested priorities and reasons
      setTasks(prevTasks => {
        const updatedTasksMap = new Map(prevTasks.map(task => [task.id, task]));
        prioritizedOutput.forEach(suggestion => {
           const existingTask = updatedTasksMap.get(suggestion.id);
           if (existingTask) {
              updatedTasksMap.set(suggestion.id, {
                 ...existingTask,
                 priority: suggestion.priority,
                 aiReason: suggestion.reason,
              });
           }
        });
        return Array.from(updatedTasksMap.values());
      });

      toast({ title: "Tasks Prioritized", description: "AI has suggested new priorities based on deadlines and dependencies." });
    } catch (error) {
      console.error("Error during AI task prioritization:", error);
      toast({ title: "Prioritization Failed", description: "An error occurred while getting AI suggestions. Please check the console and try again.", variant: "destructive" });
    } finally {
      setIsPrioritizing(false);
    }
  }, [tasks, setTasks, toast]); // Dependencies for the prioritization logic


 // Memoize filtered and sorted tasks
 const filteredAndSortedTasks = useMemo(() => {
    if (!isClient) return []; // Return empty array during SSR or before hydration

    let result = [...tasks]; // Create a copy to avoid mutating original state

    // 1. Filter by status
    if (filterStatus !== 'all') {
      result = result.filter((task) => task.status === filterStatus);
    }

    // 2. Filter by search term (case-insensitive)
    if (searchTerm) {
      result = result.filter((task) =>
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

     // 3. Sort tasks
    result.sort((a, b) => {
      // Primary sort: AI priority (lower number is higher priority, undefined is lowest)
      const priorityA = a.priority ?? Infinity;
      const priorityB = b.priority ?? Infinity;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      // Secondary sort: Deadline (earlier deadline is higher priority)
      const deadlineA = new Date(a.deadline).getTime();
      const deadlineB = new Date(b.deadline).getTime();
      if (deadlineA !== deadlineB) {
        return deadlineA - deadlineB;
      }
      // Tertiary sort: Creation order (approximated by ID suffix - assumes higher number is newer)
      // This might need a proper timestamp if strict creation order is required.
      const idNumA = parseInt(a.id.split('-')[1] || '0');
      const idNumB = parseInt(b.id.split('-')[1] || '0');
      return idNumA - idNumB; // Older tasks (lower ID num) first
    });

    return result;
  }, [tasks, filterStatus, searchTerm, isClient]); // Recalculate when dependencies change


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-5xl"> {/* Slightly wider max-width */}
      <Header />
      <header className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-1">TaskFlow</h1>
        <p className="text-base text-muted-foreground">Organize and conquer your tasks with AI prioritization.</p>
      </header>

      {/* Controls Section */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between p-4 bg-card border rounded-lg shadow-sm">
        {/* Search Input */}
        <div className="relative flex-grow w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search task descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full h-9 text-sm bg-background" // Use background color for inputs
          />
        </div>

        {/* Filter and Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Status Filter Dropdown */}
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as TaskStatus | 'all')}>
              <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                 {/* Find the icon for the currently selected value */}
                 {React.createElement(statusFilterOptions.find(opt => opt.value === filterStatus)?.icon ?? Filter, { className: "h-4 w-4 mr-2" })}
                 <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                 <SelectGroup>
                    <SelectLabel>Filter by Status</SelectLabel>
                     {statusFilterOptions.map(option => (
                       <SelectItem key={option.value} value={option.value}>
                         <div className="flex items-center">
                           {option.icon && <option.icon className="mr-2 h-4 w-4" />}
                           {option.label}
                         </div>
                       </SelectItem>
                     ))}
                  </SelectGroup>
              </SelectContent>
            </Select>

            {/* AI Prioritize Button */}
            <Button onClick={handleAiPrioritize} disabled={isPrioritizing} size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground h-9 w-full sm:w-auto">
              {isPrioritizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
              Prioritize
            </Button>

            {/* New Task Button */}
            <Button onClick={() => setIsFormOpen(true)} size="sm" className="h-9 w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> New Task
            </Button>
        </div>
      </div>

      <Separator className="mb-6"/>

       {/* Task List or Loading/Empty State */}
       {isClient ? (
         <TaskList
            tasks={filteredAndSortedTasks}
            onUpdateTask={handleUpdateTask} // Pass update handler
            onDeleteTask={handleDeleteTask} // Pass delete handler
            allTaskIds={allTaskIds}       // Pass all IDs for dependency management
          />
       ) : (
         // Simple loading state during SSR/initial hydration
         <div className="text-center p-10">
           <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
           <p className="text-muted-foreground mt-3">Loading tasks...</p>
         </div>
       )}

      {/* Task Form Dialog (controlled by isFormOpen state) */}
      <TaskFormDialog
        isOpen={isFormOpen}
        onClose={handleDialogClose} // Use the memoized close handler
        onTaskSubmit={editingTask ? handleUpdateTask : handleAddTask} // Submit handler depends on edit state
        initialTaskData={editingTask} // Pass task data if editing
        existingTaskIds={allTaskIds} // Pass all task IDs for dependency selection
      />
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center p-4">
      <h1 className="ml-2 text-xl font-bold">TaskFlow</h1>
    </header>
  );
}
