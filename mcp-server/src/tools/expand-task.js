/**
 * tools/expand-task.js
 * Tool to expand a task into subtasks
 */

import { z } from 'zod';
import {
	handleApiResult,
	createErrorResponse,
	getProjectRootFromSession
} from './utils.js';
import { saveSubtasksDirect } from '../core/task-master-core.js';
import { findTasksJsonPath, readTasks } from '../core/utils/path-utils.js';
import fs from 'fs';
import path from 'path';
import {
	_generateExpandTaskPrompt,
	parseSubtasksFromCompletion
} from '../core/utils/ai-client-utils.js';

/**
 * Register the expand-task tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerExpandTaskTool(server) {
	server.addTool({
		name: 'expand_task',
		description: 'Expand a task into subtasks for detailed implementation using client-side LLM sampling.',
		parameters: z.object({
			id: z.string().describe('ID of task to expand'),
			num: z.string().optional().describe('Approximate number of subtasks to generate'),
			research: z
				.boolean()
				.optional()
				.describe('Hint for client LLM to use research capabilities'),
			prompt: z
				.string()
				.optional()
				.describe('Additional context for subtask generation'),
			file: z.string().optional().describe('Absolute path to the tasks file'),
			projectRoot: z
				.string()
				.optional()
				.describe('The directory of the project. Must be an absolute path. If not provided, derived from session.'),
			force: z.boolean().optional().describe('Force overwriting existing subtasks')
		}),
		execute: async (args, context) => {
			const { log, session } = context;
			try {
				log.info(`Starting expand-task with args: ${JSON.stringify(args)}`);

				const rootFolder =
					args.projectRoot || getProjectRootFromSession(session, log);
				if (!rootFolder) {
					return createErrorResponse('Could not determine project root.');
				}

				let tasksJsonPath;
				let existingTasksData;
				let parentTask;
				try {
					tasksJsonPath = findTasksJsonPath(
						{ projectRoot: rootFolder, file: args.file },
						log
					);
					existingTasksData = readTasks(tasksJsonPath, log);
					parentTask = existingTasksData.tasks.find(t => t.id === args.id);
					if (!parentTask) {
						throw new Error(`Task with ID ${args.id} not found.`);
					}
					if (!args.force && parentTask.subtasks && parentTask.subtasks.length > 0) {
						return createErrorResponse(`Task ${args.id} already has subtasks. Use --force to overwrite.`);
					}
				} catch (error) {
					log.error(`Error finding/reading tasks.json or parent task: ${error.message}`);
					return createErrorResponse(
						`Failed to find/read tasks.json or parent task ${args.id}: ${error.message}`
					);
				}

				const { systemPrompt, userPrompt } = _generateExpandTaskPrompt(
					parentTask,
					args.num,
					args.prompt,
					args.research
				);
				if (!userPrompt) {
					return createErrorResponse('Failed to generate prompt for expanding task.');
				}

				log.info(`Initiating client-side LLM sampling via context.sample for expand_task ID ${args.id}...`);
				let completion;
				try {
					if (typeof context.sample !== 'function') {
						throw new Error('FastMCP sampling function (context.sample) is not available.');
					}
					completion = await context.sample(userPrompt, { system: systemPrompt });
				} catch (sampleError) {
					log.error(`context.sample failed: ${sampleError.message}`);
					return createErrorResponse(`Client-side sampling failed: ${sampleError.message}`);
				}

				const completionText = completion?.text;
				if (!completionText) {
					log.error('Received empty completion from context.sample.');
					return createErrorResponse('Received empty completion from client LLM.');
				}
				log.info(`Received subtask completion for task ${args.id} from client LLM.`);

				const newSubtasks = parseSubtasksFromCompletion(completionText);
				if (!newSubtasks || !Array.isArray(newSubtasks)) {
					log.error('Failed to parse valid subtasks array from LLM completion.');
					return createErrorResponse('Failed to parse valid subtasks array from LLM completion.');
				}
				log.info(`Parsed ${newSubtasks.length} new subtasks for task ${args.id} from completion.`);

				const saveArgs = {
					tasksJsonPath,
					projectRoot: rootFolder,
					parentTaskId: args.id,
					subtasks: newSubtasks,
					force: args.force
				};
				const result = await saveSubtasksDirect(saveArgs, log);

				return handleApiResult(result, log, `Error saving subtasks for task ${args.id}`);
			} catch (error) {
				log.error(`Unhandled error in expand-task tool: ${error.message}`);
				log.error(error.stack);
				return createErrorResponse(`Internal server error during task expansion: ${error.message}`);
			}
		}
	});
}

