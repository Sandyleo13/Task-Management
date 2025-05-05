
"use client";

import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Check, Circle, Clock, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input"; // Using Shadcn Input for checkbox style
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from '@/types/task';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox

const taskFormSchema = z.object({
  description: z.string().min(1, { message: "Description is required." }).max(100, { message: "Description must be 100 characters or less." }),
  deadline: z.date({ required_error: "Deadline is required." }),
  status: z.enum(['todo', 'in-progress', 'done', 'backlog'], { required_error: "Status is required." }),
  // Dependencies are handled separately by local state 'selectedDependencies'
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskSubmit: (task: Task) => void;
  initialTaskData?: Task | null;
  existingTaskIds: string[]; // IDs of existing tasks for dependency selection
}

// Status options for the select dropdown
const statusOptions: { value: TaskStatus; label: string; icon: React.ElementType }[] = [
  { value: 'todo', label: 'To Do', icon: Circle },
  { value: 'in-progress', label: 'In Progress', icon: Clock },
  { value: 'done', label: 'Done', icon: CheckCircle },
  { value: 'backlog', label: 'Backlog', icon: AlertCircle },
];


export function TaskFormDialog({ isOpen, onClose, onTaskSubmit, initialTaskData, existingTaskIds }: TaskFormDialogProps) {
  const { toast } = useToast();
  // Manage dependencies separately from the react-hook-form state
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>(initialTaskData?.dependencies || []);

  const defaultValues: Partial<TaskFormValues> = initialTaskData
    ? {
        description: initialTaskData.description,
        deadline: new Date(initialTaskData.deadline), // Ensure deadline is a Date object
        status: initialTaskData.status,
      }
    : {
        description: "",
        deadline: new Date(), // Default to today
        status: 'todo',
      };

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues,
  });

   // Reset form and dependency state when initialTaskData changes
  useEffect(() => {
    if (initialTaskData) {
      form.reset({
        description: initialTaskData.description,
        deadline: new Date(initialTaskData.deadline),
        status: initialTaskData.status,
      });
      setSelectedDependencies(initialTaskData.dependencies || []);
    } else {
      form.reset(defaultValues);
      setSelectedDependencies([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTaskData, form]); // Don't include defaultValues here, it causes infinite loops


  const onSubmit = (data: TaskFormValues) => {
    // Generate a new ID if creating, use existing if editing
    const taskId = initialTaskData ? initialTaskData.id : `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const taskToSubmit: Task = {
      id: taskId,
      description: data.description,
      deadline: data.deadline.toISOString(), // Convert date back to ISO string
      status: data.status,
      dependencies: selectedDependencies, // Use the state for dependencies
      priority: initialTaskData?.priority, // Preserve existing priority if editing
      aiReason: initialTaskData?.aiReason, // Preserve existing AI reason if editing
    };

    try {
      onTaskSubmit(taskToSubmit);
      toast({
        title: initialTaskData ? "Task Updated" : "Task Created",
        description: `Task "${data.description}" has been ${initialTaskData ? 'updated' : 'added'}.`,
      });
      // Reset form and state after successful submission ONLY if creating a new task
      if (!initialTaskData) {
         form.reset(defaultValues);
         setSelectedDependencies([]);
      }
      onClose(); // Close the dialog
    } catch (error) {
       console.error("Error submitting task:", error);
       toast({
         title: "Error",
         description: `Failed to ${initialTaskData ? 'update' : 'create'} task. Please try again.`,
         variant: "destructive",
       });
    }
  };

  // Handler for checkbox changes in dependency list
  const handleDependencyChange = (taskId: string) => {
    setSelectedDependencies(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  // Filter out the current task's ID from the list of possible dependencies
  const availableDependencies = existingTaskIds.filter(id => id !== initialTaskData?.id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-primary">{initialTaskData ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {initialTaskData ? 'Update the details of your task.' : 'Add a new task to your list.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the task..." {...field} className="bg-input text-foreground placeholder:text-muted-foreground" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <FormField
                 control={form.control}
                 name="deadline"
                 render={({ field }) => (
                   <FormItem className="flex flex-col">
                     <FormLabel>Deadline</FormLabel>
                     <Popover>
                       <PopoverTrigger asChild>
                         <FormControl>
                           <Button
                             variant={"outline"}
                             className={cn(
                               "pl-3 text-left font-normal w-full justify-start", // Ensure button takes full width and aligns left
                               !field.value && "text-muted-foreground"
                             )}
                           >
                             {field.value ? (
                               format(field.value, "PPP") // Format date nicely e.g., Oct 26, 2023
                             ) : (
                               <span>Pick a date</span>
                             )}
                             <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                           </Button>
                         </FormControl>
                       </PopoverTrigger>
                       <PopoverContent className="w-auto p-0" align="start">
                         <Calendar
                           mode="single"
                           selected={field.value}
                           onSelect={field.onChange}
                           disabled={(date) =>
                             date < new Date(new Date().setDate(new Date().getDate() - 1)) // Disable past dates, allowing today
                           }
                           initialFocus
                         />
                       </PopoverContent>
                     </Popover>
                     <FormMessage />
                   </FormItem>
                 )}
               />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           <SelectGroup>
                            <SelectLabel>Task Status</SelectLabel>
                             {statusOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center">
                                  <option.icon className="mr-2 h-4 w-4" />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

             {/* Dependency Selection */}
             <FormItem>
               <FormLabel>Dependencies</FormLabel>
                <ScrollArea className="h-32 w-full rounded-md border p-2 bg-input">
                 {availableDependencies.length > 0 ? (
                   availableDependencies.map(taskId => (
                     <div key={taskId} className="flex items-center justify-between p-2 hover:bg-accent/10 rounded-sm">
                        {/* Ideally, fetch and display task description instead of ID */}
                       <label htmlFor={`dep-${taskId}`} className="text-sm flex-grow mr-2 cursor-pointer">{taskId.substring(0, 12)}...</label>
                       <Checkbox
                         id={`dep-${taskId}`}
                         checked={selectedDependencies.includes(taskId)}
                         onCheckedChange={() => handleDependencyChange(taskId)}
                         className="h-4 w-4"
                       />
                     </div>
                   ))
                 ) : (
                   <p className="text-sm text-muted-foreground text-center p-4">No other tasks available to depend on.</p>
                 )}
               </ScrollArea>
               <FormMessage />
             </FormItem>


            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {initialTaskData ? 'Save Changes' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
