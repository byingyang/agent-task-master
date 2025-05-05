/**
 * tools/update.js
 * Tool to update tasks based on new context/prompt
 */

import { z } from 'zod';
import {
	handleApiResult,
	createErrorResponse,
	getProjectRootFromSession
} from './utils.js';
import { saveUpdatedTasksDirect } from '../core/task-master-core.js';
import { findTasksJsonPath } from '../core/utils/path-utils.js';
import { readTasks } from '../../../scripts/modules/utils.js';
import {
	_buildUpdateMultipleTasksPrompt,
	parseTasksFromCompletion
} from '../core/utils/ai-client-utils.js';

/**
 * Register the update tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerUpdateTool(server) {
	server.addTool({
		name: 'update',
		description:
			"Update multiple upcoming tasks (with ID >= 'from' ID) based on new context/changes provided in the prompt, using client-side LLM sampling.",
		parameters: z.object({
			from: z
				.string()
				.describe(
					"Task ID from which to start updating (inclusive). IMPORTANT: This tool uses 'from', not 'id'"
				),
			prompt: z
				.string()
				.describe('Explanation of changes or new context to apply'),
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
				log.info(`Updating tasks with args: ${JSON.stringify(args)}`);

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

				const fromIdNum = parseFloat(args.from);
				const tasksToUpdateContext = existingTasksData.tasks.filter(task => {
					const taskIdNum = parseFloat(task.id);
					return !isNaN(taskIdNum) && taskIdNum >= fromIdNum && task.status !== 'done';
				});

				if (tasksToUpdateContext.length === 0) {
					return handleApiResult({ success: true, data: { message: `No tasks found with ID >= ${args.from} to update.` } }, log);
				}

				log.info(`Found ${tasksToUpdateContext.length} tasks potentially affected by the update prompt.`);

				const { systemPrompt, userPrompt } = _buildUpdateMultipleTasksPrompt(
					args.prompt,
					tasksToUpdateContext,
					args.from,
					args.research
				);
				if (!userPrompt) {
					return createErrorResponse('Failed to generate prompt for updating tasks.');
				}

				log.info(`Initiating client-side LLM sampling via context.sample for updating tasks from ID ${args.from}...`);
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
				log.info(`Received updated tasks completion from client LLM.`);

				const updatedTasksData = parseTasksFromCompletion(completionText);
				if (!updatedTasksData || !Array.isArray(updatedTasksData.tasks)) {
					log.error('Failed to parse valid updated tasks structure { tasks: [...] } from LLM completion.');
					return createErrorResponse('Failed to parse valid updated tasks structure from LLM completion.');
				}
				log.info(`Parsed ${updatedTasksData.tasks.length} updated task objects from completion.`);

				const saveArgs = {
					tasksJsonPath,
					projectRoot: rootFolder,
					updatedTasks: updatedTasksData.tasks
				};
				const result = await saveUpdatedTasksDirect(saveArgs, log);

				return handleApiResult(result, log, `Error saving updated tasks (from ID ${args.from})`);
			} catch (error) {
				log.error(`Unhandled error in update tool: ${error.message}`);
				log.error(error.stack);
				return createErrorResponse(`Internal server error during task update: ${error.message}`);
			}
		}
	});
}
