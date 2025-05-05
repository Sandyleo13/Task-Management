
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuLabel } from "@/components/ui/dropdown-menu"; // Added DropdownMenuLabel
import { CheckCircle, Circle, Clock, AlertCircle, Check, MoreVertical, Trash2, Edit, Info, CalendarDays } from 'lucide-react'; // Use specific icons
import { format, formatDistanceToNow, isPast } from 'date-fns'; // Import date-fns functions
import type { Task, TaskStatus } from '@/types/task';
import { TaskFormDialog } from '@/components/task-form-dialog'; // Import the dialog
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils"; // For conditional classes

interface TaskCardProps {
  task: Task;
  onUpdateTask: (updatedTask: Task) => void;
  onDeleteTask: (taskId: string) => void;
  allTaskIds: string[]; // Needed for TaskFormDialog when editing dependencies
}

// Define mappings for status icons, colors, and labels
const statusConfig: Record<TaskStatus, { icon: React.ElementType; color: string; label: string }> = {
  todo: { icon: Circle, color: 'text-muted-foreground', label: 'To Do' },
  'in-progress': { icon: Clock, color: 'text-blue-500', label: 'In Progress' }, // Use text color for icons
  done: { icon: CheckCircle, color: 'text-green-500', label: 'Done' },
  backlog: { icon: AlertCircle, color: 'text-orange-500', label: 'Backlog' },
};

export const TaskCard = ({ task, onUpdateTask, onDeleteTask, allTaskIds }: TaskCardProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); // State to control edit dialog
  const { icon: StatusIcon, color: statusColor, label: statusLabel } = statusConfig[task.status];

  const handleStatusChange = (newStatus: TaskStatus) => {
    onUpdateTask({ ...task, status: newStatus });
  };

  const handleDeleteConfirm = () => {
    onDeleteTask(task.id);
  };

  const handleEditSubmit = (updatedTask: Task) => {
    onUpdateTask(updatedTask);
    setIsEditDialogOpen(false); // Close dialog on successful edit
  };

  const deadlineDate = new Date(task.deadline);
  const isOverdue = isPast(deadlineDate) && task.status !== 'done';

  return (
    <>
      <Card className="mb-4 shadow-sm transition-shadow duration-200 ease-in-out hover:shadow-md border border-border bg-card text-card-foreground rounded-lg overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between p-4 pb-2 space-x-4">
          <div className="flex-1 min-w-0"> {/* Allow title to wrap */}
            <CardTitle className="text-base font-semibold leading-tight break-words">{task.description}</CardTitle>
             {task.priority !== undefined && (
               <Badge
                 variant="secondary"
                 className={cn(
                   "mt-1 text-xs font-medium",
                   task.priority <= 3 ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground", // Highlight high priority
                    !task.aiReason && "cursor-default" // Normal cursor if no AI reason
                  )}
               >
                 Priority: {task.priority}
                 {task.aiReason && (
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 ml-1 cursor-help text-muted-foreground hover:text-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                           <p className="font-semibold mb-1">AI Suggestion:</p>
                           <p>{task.aiReason}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                 )}
               </Badge>
             )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)} className="cursor-pointer">
                <Edit className="mr-2 h-4 w-4" />
                <span>Edit Task</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
               <AlertDialog>
                 <AlertDialogTrigger asChild>
                   <DropdownMenuItem
                     onSelect={(e) => e.preventDefault()} // Prevent closing dropdown
                     className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                    >
                     <Trash2 className="mr-2 h-4 w-4" />
                     <span>Delete Task</span>
                   </DropdownMenuItem>
                 </AlertDialogTrigger>
                 <AlertDialogContent>
                   <AlertDialogHeader>
                     <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                     <AlertDialogDescription>
                       This action cannot be undone. This will permanently delete the task "{task.description}".
                     </AlertDialogDescription>
                   </AlertDialogHeader>
                   <AlertDialogFooter>
                     <AlertDialogCancel>Cancel</AlertDialogCancel>
                     {/* Use the destructive variant for the confirm button */}
                     <AlertDialogAction onClick={handleDeleteConfirm} className={cn(buttonVariants({ variant: "destructive" }))}>
                       Delete
                     </AlertDialogAction>
                   </AlertDialogFooter>
                 </AlertDialogContent>
               </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="px-4 pb-3 pt-1 text-sm">
           <div className={cn(
                "flex items-center text-muted-foreground mb-2",
                isOverdue && "text-destructive font-medium" // Highlight overdue date
               )}>
            <CalendarDays className="mr-1.5 h-4 w-4 flex-shrink-0" />
            <span className="flex-1"> {/* Allow text to wrap */}
                Deadline: {format(deadlineDate, 'PP')} ({formatDistanceToNow(deadlineDate, { addSuffix: true })})
            </span>
            {isOverdue && <Badge variant="destructive" className="ml-2 text-xs">Overdue</Badge>}
          </div>

          {task.dependencies && task.dependencies.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Depends on:</p>
              <div className="flex flex-wrap gap-1">
                {task.dependencies.map((depId) => (
                  // Ideally, fetch task description for the badge content
                  <Badge key={depId} variant="outline" className="text-xs px-1.5 py-0.5 font-normal">
                     {depId.substring(0, 8)}...
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-4 pt-0 flex justify-start">
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="outline" size="sm" className="flex items-center gap-1 text-xs h-7 px-2 py-1">
                 <StatusIcon className={cn("h-3.5 w-3.5 mr-1", statusColor)} />
                 {statusLabel}
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="start">
               <DropdownMenuGroup>
                <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                 {(Object.keys(statusConfig) as TaskStatus[]).map((status) => {
                    const { icon: Icon, color, label } = statusConfig[status];
                    return (
                        <DropdownMenuItem key={status} onSelect={() => handleStatusChange(status)} disabled={task.status === status} className="cursor-pointer">
                        {task.status === status && <Check className="absolute left-2 h-4 w-4" />}
                        <Icon className={cn("mr-2 h-4 w-4", color)} />
                        {label}
                        </DropdownMenuItem>
                    );
                 })}
               </DropdownMenuGroup>
             </DropdownMenuContent>
           </DropdownMenu>
        </CardFooter>
      </Card>

      {/* Edit Task Dialog */}
      <TaskFormDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onTaskSubmit={handleEditSubmit}
        initialTaskData={task}
        existingTaskIds={allTaskIds} // Pass all task IDs for dependency selection
      />
    </>
  );
};

// Helper function to get button variants (replace with actual ShadCN function if available)
const buttonVariants = ({ variant }: { variant: string }) => {
  if (variant === "destructive") {
    return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
  }
  return ""; // Default or other variants
};
