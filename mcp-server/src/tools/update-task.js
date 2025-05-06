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
import { findTasksJsonPath } from '../core/utils/path-utils.js';
import { readJSON } from '../../../scripts/modules/utils.js';

// NEW: Import AI utils
import {
	_buildUpdateTaskPrompt,
	parseTaskJsonResponse
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
					existingTasksData = readJSON(tasksJsonPath, log);
					taskToUpdate = existingTasksData.tasks.find(t => t.id === args.id);
					if (!taskToUpdate) {
						throw new Error(`Task with ID ${args.id} not found.`);
					}
					log.info(`Task ID ${args.id} found for update.`);
				} catch (error) {
					log.error(`Error finding/reading tasks.json or task ${args.id}: ${error.message}`);
					return createErrorResponse(
						`Failed to find/read tasks.json or task ${args.id}: ${error.message}`
					);
				}

				// Generate prompts
				const { systemPrompt, userPrompt } = _buildUpdateTaskPrompt(
					taskToUpdate,
					args.prompt
				);

				if (!userPrompt) {
					return createErrorResponse('Failed to generate prompt for updating the task.');
				}

				log.info(`Initiating client-side LLM sampling via context.sample for updating task ${args.id}...`);
				let completion;
				try {
					if (typeof session.requestSampling !== 'function') {
						throw new Error('FastMCP sampling function (session.requestSampling) is not available.');
					}
					completion = await session.requestSampling({
						messages: [{ role: 'user', content: { type: 'text', text: userPrompt } }],
						systemPrompt: systemPrompt, // systemPrompt can be undefined if not generated
						// includeContext: "thisServer", // Consider if necessary based on FastMCP version/needs
						// maxTokens: 4000, // Consider if necessary
					});
				} catch (sampleError) {
					log.error(`session.requestSampling failed: ${sampleError.message}`);
					return createErrorResponse(`Client-side sampling failed: ${sampleError.message}`);
				}

				const completionText = completion?.content; // Adjusted to common FastMCP response structure
				if (!completionText) {
					log.error('Received empty completion from session.requestSampling.');
					return createErrorResponse('Received empty completion from client LLM.');
				}
				log.info(`Received updated task completion from client LLM.`);

				// Parse the single updated task
				const updatedTask = parseTaskJsonResponse(completionText);
				if (!updatedTask || typeof updatedTask !== 'object' || !updatedTask.id) {
					log.error('Failed to parse a valid updated task object from LLM completion.');
					return createErrorResponse('Failed to parse a valid updated task object from LLM completion.');
				}
				// Ensure the ID matches the original task being updated
				if (String(updatedTask.id) !== String(args.id)) {
					log.error(`Parsed task ID (${updatedTask.id}) does not match requested ID (${args.id}).`);
					return createErrorResponse(`LLM returned task with incorrect ID.`);
				}

				log.info(`Parsed updated task object for ID: ${updatedTask.id}`);

				// Call the same save function as the 'update' tool, passing an array with the single updated task
				const saveArgs = {
					tasksJsonPath,
					projectRoot: rootFolder,
					updatedTasks: [updatedTask]
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
