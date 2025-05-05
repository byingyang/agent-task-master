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
import { findTasksJsonPath } from '../core/utils/path-utils.js';
import { readJSON } from '../../../scripts/modules/utils.js';
import fs from 'fs';
import path from 'path';
import {
	generateSubtaskPrompt,
	parseSubtasksFromText
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
					existingTasksData = readJSON(tasksJsonPath, log);
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

				const userPrompt = generateSubtaskPrompt(
					parentTask,
					args.num ? parseInt(args.num, 10) : undefined,
					args.prompt,
					args.research
				);

				if (!userPrompt) {
					return createErrorResponse('Failed to generate prompt for expanding the task.');
				}

				const systemPrompt = null;

				log.info(`Initiating client-side LLM sampling via context.sample for expanding task ${args.id}...`);
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
				log.info(`Received subtask completion from client LLM.`);

				const subtasks = parseSubtasksFromText(completionText, args.num ? parseInt(args.num, 10) : undefined, args.id);
				if (!subtasks || !Array.isArray(subtasks)) {
					log.error('Failed to parse valid subtasks array from LLM completion.');
					return createErrorResponse('Failed to parse valid subtasks array from LLM completion.');
				}
				log.info(`Parsed ${subtasks.length} subtasks from completion.`);

				const saveArgs = {
					tasksJsonPath,
					projectRoot: rootFolder,
					taskId: args.id,
					subtasks,
					force: args.force === true
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

