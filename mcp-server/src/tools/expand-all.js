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
import { findTasksJsonPath } from '../core/utils/path-utils.js';
import { readJSON } from '../../../scripts/modules/utils.js';
import {
	generateSubtaskPrompt,
	parseSubtasksFromText
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
					existingTasksData = readJSON(tasksJsonPath, log);
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
				const results = [];
				let failedCount = 0;

				for (const task of tasksToExpand) {
					log.info(`Expanding task ${task.id}: "${task.title}"`);

					// Find complexity analysis for this task, if available
					const taskAnalysis = complexityReport
						? complexityReport.complexityAnalysis?.find(a => String(a.taskId) === String(task.id))
						: null;
                    
                    // Determine target subtask count, using analysis if available
                    const numSubtasksForThisTask = taskAnalysis?.recommendedSubtasks 
                        ? taskAnalysis.recommendedSubtasks 
                        : (args.num ? parseInt(args.num, 10) : undefined);

					// Generate prompt using the correct function
					const userPrompt = generateSubtaskPrompt(
						task,
                        numSubtasksForThisTask,
						args.prompt, // General prompt applies to all
                        taskAnalysis // Pass analysis for context
					);

					if (!userPrompt) {
						log.warn(`Skipping task ${task.id}: Failed to generate prompt.`);
						failedCount++;
						continue;
					}

					// System prompt is null for subtask generation
					const systemPrompt = null;

					log.info(`Initiating sampling for task ${task.id}...`);
					let completion;
					try {
						if (typeof context.sample !== 'function') {
							throw new Error('FastMCP sampling function (context.sample) is not available.');
						}
						completion = await context.sample(userPrompt, { system: systemPrompt });
					} catch (sampleError) {
						log.error(`Sampling failed for task ${task.id}: ${sampleError.message}`);
						failedCount++;
						continue; // Skip to next task
					}

					const completionText = completion?.text;
					if (!completionText) {
						log.warn(`Skipping task ${task.id}: Received empty completion.`);
						failedCount++;
						continue;
					}

					// Parse subtasks using the correct function
					const subtasks = parseSubtasksFromText(completionText, numSubtasksForThisTask, task.id);
					if (!subtasks || !Array.isArray(subtasks)) {
						log.warn(`Skipping task ${task.id}: Failed to parse subtasks from completion.`);
						failedCount++;
						continue;
					}

					results.push({ taskId: task.id, subtasks });
					log.info(`Successfully generated ${subtasks.length} subtasks for task ${task.id}`);
				}

				if (results.length === 0) {
                    const message = failedCount > 0 ? `Expansion failed for all ${failedCount} eligible tasks.` : 'No tasks eligible for expansion were found.';
					return handleApiResult({ success: true, data: { message } }, log);
				}

				// Call direct function to save all generated subtasks
				const saveArgs = {
					tasksJsonPath,
					projectRoot: rootFolder,
					subtaskUpdates: results, // Array of {taskId, subtasks}
                    force: args.force === true
				};
                // This likely needs a new direct function: saveMultipleTaskSubtasksDirect
				const saveResult = await saveMultipleTaskSubtasksDirect(saveArgs, log);

				return handleApiResult(saveResult, log, 'Error saving expanded subtasks for multiple tasks');

			} catch (error) {
				log.error(`Unhandled error in expand-all tool: ${error.message}`);
				log.error(error.stack);
				return createErrorResponse(`Internal server error during expand all tasks: ${error.message}`);
			}
		}
	});
}
