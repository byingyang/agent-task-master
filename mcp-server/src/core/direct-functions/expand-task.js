/**
 * expand-task.js
 * Direct function implementation for expanding a task into subtasks using FastMCP sampling.
 */

// Removed: import { expandTask } from '../../../../scripts/modules/task-manager.js';
import { generateTaskFiles } from '../../../../scripts/modules/task-manager.js'; // Keep for generating files
import {
	readJSON,
	writeJSON,
	enableSilentMode,
	disableSilentMode
	// Removed: isSilentMode (handled implicitly)
} from '../../../../scripts/modules/utils.js';
import {
	// Removed: getAnthropicClientForMCP,
	// Removed: getModelConfig
} from '../utils/ai-client-utils.js';
// Import necessary AI prompt/parsing helpers from the correct location
import {
	generateSubtaskPrompt,
	parseSubtasksFromText
} from '../utils/ai-client-utils.js'; // Updated path
// Removed import from ai-services.js

import path from 'path';
import fs from 'fs';

/**
 * Direct function wrapper for expanding a task into subtasks using FastMCP sampling.
 *
 * @param {Object} args - Command arguments
 * @param {string} args.tasksJsonPath - Explicit path to the tasks.json file.
 * @param {string} args.id - The ID of the task to expand.
 * @param {number|string} [args.num] - Number of subtasks to generate.
 * @param {boolean} [args.research] - Research hint (handled by client LLM).
 * @param {string} [args.prompt] - Additional context to guide subtask generation.
 * @param {boolean} [args.force] - Force expansion even if subtasks exist.
 * @param {Object} log - Logger object
 * @param {Object} context - Context object containing session for sampling.
 * @returns {Promise<Object>} - Task expansion result { success: boolean, data?: any, error?: { code: string, message: string }, fromCache: boolean }
 */
export async function expandTaskDirect(args, log, context = {}) {
	const { session } = context;
	const { tasksJsonPath, id, num, research, prompt, force } = args;

	// --- Input Validation ---
	if (!tasksJsonPath) {
		log.error('expandTaskDirect called without tasksJsonPath');
		return {
			success: false,
			error: { code: 'MISSING_ARGUMENT', message: 'tasksJsonPath is required' },
			fromCache: false
		};
	}
	const taskId = id ? parseInt(id, 10) : null;
	if (!taskId) {
		log.error('Task ID is required');
		return {
			success: false,
			error: { code: 'INPUT_VALIDATION_ERROR', message: 'Task ID is required' },
			fromCache: false
		};
	}
	// Corrected check for session.requestSampling
	if (!session || typeof session.requestSampling !== 'function') {
		const errorMessage = 'FastMCP sampling function (session.requestSampling) is not available.';
		log.error(errorMessage);
		return {
			success: false,
			error: { code: 'SAMPLING_UNAVAILABLE', message: errorMessage },
			fromCache: false
		};
	}

	const tasksPath = tasksJsonPath;
	const numSubtasks = num ? parseInt(num, 10) : undefined; // Use undefined for default handling later
	const additionalContext = prompt || '';
	const forceFlag = force === true;
	// Note: 'research' flag is implicitly handled by the client LLM now.

	log.info(
		`[expandTaskDirect] Expanding task ${taskId} via MCP sampling. NumSubtasks=${numSubtasks || 'default'}, Force=${forceFlag}`
	);

	try {
		// --- Read Task Data ---
		log.info(`[expandTaskDirect] Reading tasks from: ${tasksPath}`);
		const data = readJSON(tasksPath);
		if (!data || !Array.isArray(data.tasks)) {
			log.error(`[expandTaskDirect] Failed to read valid tasks data from ${tasksPath}`);
			return {
				success: false,
				error: { code: 'INVALID_TASKS_FILE', message: `Invalid or missing tasks data in ${tasksPath}` },
				fromCache: false
			};
		}

		// Find the task to expand
		const taskIndex = data.tasks.findIndex((t) => t.id === taskId);
		if (taskIndex === -1) {
			log.error(`[expandTaskDirect] Task ${taskId} not found.`);
			return {
				success: false,
				error: { code: 'TASK_NOT_FOUND', message: `Task with ID ${taskId} not found` },
				fromCache: false
			};
		}
		const task = data.tasks[taskIndex];

		// --- Pre-Expansion Checks ---
		if (task.status === 'done' || task.status === 'completed') {
			return {
				success: false,
				error: { code: 'TASK_COMPLETED', message: `Task ${taskId} is already completed` },
				fromCache: false
			};
		}

		const hasExistingSubtasks = task.subtasks && task.subtasks.length > 0;
		if (hasExistingSubtasks && !forceFlag) {
			log.info(`Task ${taskId} already has subtasks. Use --force to overwrite.`);
			return {
				success: true,
				data: { message: `Task ${taskId} already has subtasks. Skipped.`, task, subtasksAdded: 0 },
				fromCache: false
			};
		}

		// If force flag is set, clear existing subtasks (will be replaced)
		if (hasExistingSubtasks && forceFlag) {
			log.info(`Force flag set. Existing subtasks for task ${taskId} will be replaced.`);
			task.subtasks = []; // Clear existing for replacement
		}

		// --- Start of Refactored Logic ---

		// 1. Construct Prompt for Subtask Generation
		// Use the imported helper function
		// Note: Assumes generateSubtaskPrompt handles complexity report integration if applicable
		// Read complexity report if available (adjust path as needed)
		let complexityReport = null;
		const reportPath = path.join(path.dirname(tasksPath), '../scripts/task-complexity-report.json'); // Default path
		try {
		    if (fs.existsSync(reportPath)) {
		        complexityReport = readJSON(reportPath);
		    }
		} catch (err) {
		    log.warn(`Could not read complexity report at ${reportPath}: ${err.message}`);
		}

		const subtaskPrompt = generateSubtaskPrompt(task, numSubtasks, additionalContext, complexityReport);
		if (!subtaskPrompt) {
			throw new Error('Failed to generate the prompt for subtask expansion.');
		}
		log.info('Generated subtask expansion prompt for sampling.');

		// 2. Call FastMCP Sampling (Using session.requestSampling)
		let completionText;
		try {
			log.info('Initiating FastMCP LLM sampling via client...');
			const completion = await session.requestSampling({ // Use session.requestSampling
				messages: [{ role: 'user', content: { type: 'text', text: subtaskPrompt } }]
				// No systemPrompt for subtask generation typically
			});
			log.info('Received completion from client LLM.');
			completionText = completion?.content; // Adjusted to common FastMCP response structure
			if (!completionText) {
				throw new Error('Received empty completion text from client LLM via sampling.');
			}
		} catch (error) {
			log.error(`LLM sampling failed: ${error.message}`);
			throw new Error(`Failed to get completion via sampling: ${error.message}`); // Re-throw to be caught by outer try/catch
		}

		// 3. Parse Subtasks from Completion
		let newSubtasks;
		try {
			// Use the imported helper function
			newSubtasks = parseSubtasksFromText(completionText, numSubtasks, taskId); // Pass expected count and parent ID
			if (!Array.isArray(newSubtasks)) {
				throw new Error('Parsing did not return a valid array of subtasks.');
			}
			log.info(`Parsed ${newSubtasks.length} new subtasks from completion.`);
		} catch (error) {
			log.error(`Failed to parse subtasks from LLM completion: ${error.message}`);
			throw new Error(`Failed to parse subtasks from LLM completion: ${error.message}`);
		}

		// --- Post-Generation Processing ---

		// Assign IDs and merge/replace subtasks
		const nextSubtaskId = (task.subtasks?.length || 0) + 1;
		newSubtasks.forEach((subtask, index) => {
			subtask.id = nextSubtaskId + index; // Simple sequential IDs within the parent
			subtask.status = subtask.status || 'pending'; // Default status
		});

		// Replace or set the subtasks array
		task.subtasks = newSubtasks;

		// 4. Save Updated Task Data
		// Update the task in the main data array
		data.tasks[taskIndex] = task;
		writeJSON(tasksPath, data);
		log.info(`Updated tasks file ${tasksPath} with new subtasks for task ${taskId}.`);

		// Create logger wrapper
		const logWrapper = {
			info: (message, ...args) => log.info(message, ...args),
			warn: (message, ...args) => log.warn(message, ...args),
			error: (message, ...args) => log.error(message, ...args),
			debug: (message, ...args) => log.debug && log.debug(message, ...args),
			success: (message, ...args) => log.info(message, ...args)
		};

		// 5. Generate Individual Task Files (in silent mode)
		enableSilentMode();
		try {
			await generateTaskFiles(tasksPath, path.dirname(tasksPath), { mcpLog: logWrapper }); // Use wrapper
			log.info('Generated individual task files.');
		} finally {
			disableSilentMode();
		}

		// --- End of Refactored Logic ---

		// 6. Return Success
		log.info(`Successfully expanded task ${taskId} with ${newSubtasks.length} new subtasks via sampling.`);
		return {
			success: true,
			data: {
				task, // Return the updated task object
				subtasksAdded: newSubtasks.length
			},
			fromCache: false
		};

	} catch (error) {
		log.error(`Error during MCP expandTaskDirect: ${error.message}`);
		log.error(error.stack);
		return {
			success: false,
			error: {
				code: 'EXPAND_TASK_SAMPLING_ERROR',
				message: error.message || 'Unknown error during task expansion via sampling'
			},
			fromCache: false
		};
	}
}
