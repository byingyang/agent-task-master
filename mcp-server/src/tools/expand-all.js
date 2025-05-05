/**
 * tools/expand-all.js
 * Tool for expanding all pending tasks with subtasks
 */

import { z } from 'zod';
import {
	handleApiResult,
	createErrorResponse,
	getProjectRootFromSession
} from './utils.js';
import { saveMultipleTaskSubtasksDirect } from '../core/task-master-core.js';
import { findTasksJsonPath, readTasks } from '../core/utils/path-utils.js';
import {
	_generateExpandTaskPrompt,
	parseSubtasksFromCompletion
} from '../core/utils/ai-client-utils.js';

/**
 * Register the expandAll tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerExpandAllTool(server) {
	server.addTool({
		name: 'expand_all',
		description: 'Expand all pending tasks into subtasks using client-side LLM sampling.',
		parameters: z.object({
			num: z
				.string()
				.optional()
				.describe('Approximate number of subtasks to generate for each task'),
			research: z
				.boolean()
				.optional()
				.describe('Hint for client LLM to use research capabilities'),
			prompt: z
				.string()
				.optional()
				.describe('Additional context to guide subtask generation for all tasks'),
			force: z
				.boolean()
				.optional()
				.describe(
					'Force regeneration of subtasks for tasks that already have them'
				),
			file: z
				.string()
				.optional()
				.describe(
					'Absolute path to the tasks file (default: tasks/tasks.json)'
				),
			projectRoot: z
				.string()
				.optional()
				.describe('The directory of the project. Must be an absolute path. If not provided, derived from session.')
		}),
		execute: async (args, context) => {
			const { log, session } = context;
			try {
				log.info(`Expanding all tasks with args: ${JSON.stringify(args)}`);

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

				const tasksToExpand = existingTasksData.tasks.filter(task =>
					task.status === 'pending' &&
					(!task.subtasks || task.subtasks.length === 0 || args.force)
				);

				if (tasksToExpand.length === 0) {
					return handleApiResult({ success: true, data: { message: 'No pending tasks eligible for expansion found.' } }, log);
				}

				log.info(`Found ${tasksToExpand.length} tasks eligible for expansion.`);
				const allSubtaskUpdates = [];

				for (const parentTask of tasksToExpand) {
					log.info(`Processing expansion for task ID: ${parentTask.id}`);
					const { systemPrompt, userPrompt } = _generateExpandTaskPrompt(
						parentTask,
						args.num,
						args.prompt,
						args.research
					);

					if (!userPrompt) {
						log.warn(`Skipping task ${parentTask.id}: Failed to generate expansion prompt.`);
						continue;
					}

					log.info(`Initiating client-side LLM sampling for task ${parentTask.id}...`);
					let completion;
					try {
						if (typeof context.sample !== 'function') {
							throw new Error('FastMCP sampling function (context.sample) is not available.');
						}
						completion = await context.sample(userPrompt, { system: systemPrompt });
					} catch (sampleError) {
						log.error(`context.sample failed for task ${parentTask.id}: ${sampleError.message}`);
						log.warn(`Skipping expansion for task ${parentTask.id} due to sampling error.`);
						continue;
					}

					const completionText = completion?.text;
					if (!completionText) {
						log.warn(`Skipping task ${parentTask.id}: Received empty completion from client LLM.`);
						continue;
					}
					log.info(`Received subtask completion for task ${parentTask.id}.`);

					const newSubtasks = parseSubtasksFromCompletion(completionText);
					if (!newSubtasks || !Array.isArray(newSubtasks)) {
						log.warn(`Skipping task ${parentTask.id}: Failed to parse valid subtasks array from completion.`);
						continue;
					}
					log.info(`Parsed ${newSubtasks.length} subtasks for task ${parentTask.id}.`);

					allSubtaskUpdates.push({ parentTaskId: parentTask.id, subtasks: newSubtasks });
				}

				if (allSubtaskUpdates.length === 0) {
					 log.warn('No tasks were successfully expanded after processing.');
					 return handleApiResult({ success: true, data: { message: 'No tasks were successfully expanded.' } }, log);
				}

				log.info(`Successfully generated subtasks for ${allSubtaskUpdates.length} tasks. Saving changes...`);

				const saveArgs = {
					tasksJsonPath,
					projectRoot: rootFolder,
					updates: allSubtaskUpdates,
					force: args.force
				};
				const result = await saveMultipleTaskSubtasksDirect(saveArgs, log);

				return handleApiResult(result, log, 'Error saving expanded subtasks for multiple tasks');

			} catch (error) {
				log.error(`Unhandled error in expand-all tool: ${error.message}`);
				log.error(error.stack);
				return createErrorResponse(`Internal server error during expand all tasks: ${error.message}`);
			}
		}
	});
}
