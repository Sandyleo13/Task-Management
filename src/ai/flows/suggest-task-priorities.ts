'use server';

/**
 * @fileOverview This file defines a Genkit flow for AI-powered task prioritization.
 *
 * It allows users to get suggested task priorities based on deadlines and dependencies to optimize their workflow.
 * - suggestTaskPriorities - A function that handles the task prioritization process.
 * - SuggestTaskPrioritiesInput - The input type for the suggestTaskPriorities function.
 * - SuggestTaskPrioritiesOutput - The return type for the suggestTaskPriorities function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SuggestTaskPrioritiesInputSchema = z.array(
  z.object({
    id: z.string().describe('Unique identifier for the task.'),
    description: z.string().describe('A description of the task.'),
    deadline: z.string().describe('The deadline for the task (ISO format).'),
    dependencies: z.array(z.string()).describe('List of task IDs that this task depends on.'),
  })
).describe('An array of tasks to prioritize, each with a description, deadline, and dependencies.');

export type SuggestTaskPrioritiesInput = z.infer<typeof SuggestTaskPrioritiesInputSchema>;

const SuggestTaskPrioritiesOutputSchema = z.array(
  z.object({
    id: z.string().describe('Unique identifier for the task.'),
    priority: z.number().describe('The suggested priority for the task (lower number means higher priority).'),
    reason: z.string().describe('The reasoning behind the assigned priority.'),
  })
).describe('An array of tasks with their suggested priorities and reasons.');

export type SuggestTaskPrioritiesOutput = z.infer<typeof SuggestTaskPrioritiesOutputSchema>;

export async function suggestTaskPriorities(input: SuggestTaskPrioritiesInput): Promise<SuggestTaskPrioritiesOutput> {
  return suggestTaskPrioritiesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTaskPrioritiesPrompt',
  input: {
    schema: z.object({
      tasks: z.string().describe('An array of tasks to prioritize.'),
    }),
  },
  output: {
    schema: z.array(
      z.object({
        id: z.string().describe('Unique identifier for the task.'),
        priority: z.number().describe('The suggested priority for the task (lower number means higher priority).'),
        reason: z.string().describe('The reasoning behind the assigned priority.'),
      })
    ),
  },
  prompt: `You are an AI task prioritization expert. Given the following tasks, 
you will suggest a priority for each task based on its deadline and dependencies.

Tasks:
{{#each (JSONparse tasks)}}
  - ID: {{this.id}}
    Description: {{this.description}}
    Deadline: {{this.deadline}}
    Dependencies: {{this.dependencies}}
{{/each}}

Prioritize the tasks such that tasks with earlier deadlines and more dependencies are given higher priority (lower number). 
Explain your reasoning for each task's priority.

Return a JSON array of tasks with their suggested priorities and reasons. 
Each object in the array should include the task's ID, suggested priority (number), and reasoning (string).`,
  // The JSONparse helper function is used in the prompt to parse the JSON string into an object
  helpers: {
    JSONparse: function (str) {
      try {
        return JSON.parse(str);
      } catch (e) {
        console.error('Error parsing JSON string:', str, e);
        return [];
      }
    },
  },
});

const suggestTaskPrioritiesFlow = ai.defineFlow<
  typeof SuggestTaskPrioritiesInputSchema,
  typeof SuggestTaskPrioritiesOutputSchema
>({
  name: 'suggestTaskPrioritiesFlow',
  inputSchema: SuggestTaskPrioritiesInputSchema,
  outputSchema: SuggestTaskPrioritiesOutputSchema,
}, async input => {
  // Convert the array of tasks to a JSON string
  const tasksString = JSON.stringify(input);

  const {output} = await prompt({
    tasks: tasksString,
  });

  return output!;
});
