/**
 * tools/add-task.js
 * Tool to add a new task using AI
 */

import { z } from 'zod';
import {
	createErrorResponse,
	createContentResponse,
	getProjectRootFromSession,
	executeTaskMasterCommand,
	handleApiResult
} from './utils.js';
import { saveNewTaskDirect } from '../core/task-master-core.js';
import { findTasksJsonPath, readTasks } from '../core/utils/path-utils.js';
import fs from 'fs';
import {
	_generateAddTaskPrompt,
	parseTaskFromCompletion
} from '../core/utils/ai-client-utils.js';

/**
 * Register the addTask tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerAddTaskTool(server) {
	server.addTool({
		name: 'add_task',
		description: 'Add a new task using client-side LLM sampling.',
		parameters: z.object({
			prompt: z
				.string()
				.describe(
					'Required: Description of the task to add (AI will generate details).'
				),
			title: z.string().optional().describe('Optional: Suggest a title (AI may override)'),
			description: z.string().optional().describe('Optional: Suggest a description (AI may override)'),
			details: z.string().optional().describe('Optional: Suggest details (AI may override)'),
			testStrategy: z.string().optional().describe('Optional: Suggest test strategy (AI may override)'),
			dependencies: z
				.string()
				.optional()
				.describe('Comma-separated list of task IDs this task depends on'),
			priority: z
				.string()
				.optional()
				.describe('Task priority (high, medium, low)'),
			file: z
				.string()
				.optional()
				.describe('Path to the tasks file (default: tasks/tasks.json)'),
			projectRoot: z
				.string()
				.optional()
				.describe('The directory of the project. Must be an absolute path. If not provided, derived from session.'),
			research: z
				.boolean()
				.optional()
				.describe('Hint for client LLM to use research capabilities')
		}),
		execute: async (args, context) => {
			const { log, session } = context;
			try {
				log.info(`Starting add-task with args: ${JSON.stringify(args)}`);

				const rootFolder =
					args.projectRoot || getProjectRootFromSession(session, log);
				if (!rootFolder) {
					return createErrorResponse('Could not determine project root.');
				}

				let tasksJsonPath;
				let existingTasksData;
				try {
					tasksJsonPath = findTasksJsonPath(
						{ projectRoot: rootFolder, file: args.file },
						log
					);
					existingTasksData = readTasks(tasksJsonPath, log);
				} catch (error) {
					log.error(`Error finding or reading tasks.json: ${error.message}`);
					return createErrorResponse(
						`Failed to find or read tasks.json: ${error.message}`
					);
				}

				if (!args.prompt) {
					return createErrorResponse('Task prompt is required for AI task generation.');
				}
				const { systemPrompt, userPrompt } = _generateAddTaskPrompt(
					args.prompt,
					existingTasksData.tasks,
					args.dependencies,
					args.priority,
					args.research,
					{ titleHint: args.title, descriptionHint: args.description }
				);
				if (!userPrompt) {
					return createErrorResponse('Failed to generate prompt for adding task.');
				}

				log.info('Initiating client-side LLM sampling via context.sample for add_task...');
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
				log.info('Received new task completion from client LLM.');

				const newTaskData = parseTaskFromCompletion(completionText);
				if (!newTaskData || typeof newTaskData !== 'object' || !newTaskData.title) {
					log.error('Failed to parse valid task object from LLM completion.');
					return createErrorResponse('Failed to parse valid task object from LLM completion.');
				}
				log.info(`Parsed new task: "${newTaskData.title}" from completion.`);

				const saveArgs = {
					tasksJsonPath,
					projectRoot: rootFolder,
					newTaskData
				};
				const result = await saveNewTaskDirect(saveArgs, log);

				return handleApiResult(result, log, 'Error saving new task');
			} catch (error) {
				log.error(`Unhandled error in add-task tool: ${error.message}`);
				log.error(error.stack);
				return createErrorResponse(`Internal server error during add task: ${error.message}`);
			}
		}
	});
}
