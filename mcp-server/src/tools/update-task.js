/**
 * tools/update-task.js
 * Tool to update a single task by ID with new information
 */

import { z } from 'zod';
import {
	handleApiResult,
	createErrorResponse,
	getProjectRootFromSession
} from './utils.js';
import { saveUpdatedTasksDirect } from '../core/task-master-core.js';
import { findTasksJsonPath, readTasks } from '../core/utils/path-utils.js';

// NEW: Import AI utils
import {
	_generateUpdateSingleTaskPrompt, // Assuming name
	parseSingleUpdatedTaskFromCompletion // Assuming name
} from '../core/utils/ai-client-utils.js';

/**
 * Register the update-task tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerUpdateTaskTool(server) {
	server.addTool({
		name: 'update_task',
		description:
			'Updates a single task by ID with new information/context provided in the prompt, using client-side LLM sampling.',
		parameters: z.object({
			id: z
				.string()
				.describe(
					"ID of the task (e.g., '15') to update. Subtasks are supported using the update-subtask tool."
				),
			prompt: z
				.string()
				.describe('New information or context to incorporate into the task'),
			research: z
				.boolean()
				.optional()
				.describe('Hint for client LLM to use research capabilities'),
			file: z.string().optional().describe('Absolute path to the tasks file'),
			projectRoot: z
				.string()
				.optional()
				.describe('The directory of the project. Must be an absolute path. If not provided, derived from session.')
		}),
		execute: async (args, context) => {
			const { log, session } = context;
			try {
				log.info(`Updating task with args: ${JSON.stringify(args)}`);

				const rootFolder =
					args.projectRoot || getProjectRootFromSession(session, log);
				if (!rootFolder) {
					return createErrorResponse('Could not determine project root.');
				}

				let tasksJsonPath;
				let existingTasksData;
				let taskToUpdate;
				try {
					tasksJsonPath = findTasksJsonPath(
						{ projectRoot: rootFolder, file: args.file },
						log
					);
					existingTasksData = readTasks(tasksJsonPath, log);
					taskToUpdate = existingTasksData.tasks.find(t => t.id === args.id);
					if (!taskToUpdate) {
						throw new Error(`Task with ID ${args.id} not found.`);
					}
				} catch (error) {
					log.error(`Error finding/reading tasks.json or task ${args.id}: ${error.message}`);
					return createErrorResponse(
						`Failed to find/read tasks.json or task ${args.id}: ${error.message}`
					);
				}

				const { systemPrompt, userPrompt } = _generateUpdateSingleTaskPrompt(
					args.prompt,
					taskToUpdate,
					args.research
				);
				if (!userPrompt) {
					return createErrorResponse(`Failed to generate prompt for updating task ${args.id}.`);
				}

				log.info(`Initiating client-side LLM sampling via context.sample for updating task ID ${args.id}...`);
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
				log.info(`Received updated task completion from client LLM for task ${args.id}.`);

				const updatedTaskData = parseSingleUpdatedTaskFromCompletion(completionText);
				if (!updatedTaskData || typeof updatedTaskData !== 'object' || updatedTaskData.id !== args.id) {
					log.error(`Failed to parse valid updated task object (ID: ${args.id}) from LLM completion.`);
					return createErrorResponse(`Failed to parse valid updated task object (ID: ${args.id}) from LLM completion.`);
				}
				log.info(`Parsed updated task object for ID ${args.id} from completion.`);

				const saveArgs = {
					tasksJsonPath,
					projectRoot: rootFolder,
					updatedTasks: [updatedTaskData]
				};
				const result = await saveUpdatedTasksDirect(saveArgs, log);

				return handleApiResult(result, log, `Error saving updated task ${args.id}`);
			} catch (error) {
				log.error(`Unhandled error in update_task tool: ${error.message}`);
				log.error(error.stack);
				return createErrorResponse(`Internal server error during single task update: ${error.message}`);
			}
		}
	});
}
