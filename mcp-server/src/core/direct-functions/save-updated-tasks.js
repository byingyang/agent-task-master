/**
 * mcp-server/src/core/direct-functions/save-updated-tasks.js
 * Direct function wrapper to save tasks updated by LLM sampling.
 */

import { readJSON, writeJSON } from '../../../../scripts/modules/utils.js';
import { generateTaskFilesDirect } from './generate-task-files.js'; // Assuming we want to regenerate files
import path from 'path';

/**
 * Saves updated tasks (typically from LLM completion) back to tasks.json.
 *
 * @param {Object} args - Arguments object.
 * @param {string} args.tasksJsonPath - Absolute path to the tasks.json file.
 * @param {string} args.projectRoot - Absolute path to the project root.
 * @param {Array<Object>} args.updatedTasks - Array of task objects to merge/save.
 * @param {Object} log - Logger object.
 * @returns {Promise<Object>} - Standard success/error object.
 */
export async function saveUpdatedTasksDirect(args, log) {
	const { tasksJsonPath, projectRoot, updatedTasks } = args;

	if (!tasksJsonPath || !projectRoot || !Array.isArray(updatedTasks)) {
		const message = 'Missing required arguments: tasksJsonPath, projectRoot, or updatedTasks array.';
		log.error(message);
		return { success: false, error: { code: 'MISSING_ARGS', message } };
	}

	log.info(`Saving ${updatedTasks.length} updated tasks to ${tasksJsonPath}`);

	try {
		// Read existing tasks data
		const existingTasksData = readJSON(tasksJsonPath);
		if (!existingTasksData || !Array.isArray(existingTasksData.tasks)) {
			throw new Error('Failed to read or parse existing tasks.json.');
		}

		// Create a map for faster lookups of updated tasks by ID
		const updatedTasksMap = new Map();
		updatedTasks.forEach(task => {
			// Ensure IDs are strings for consistent comparison
			updatedTasksMap.set(String(task.id), task); 
		});

		// Merge updated tasks into existing tasks
		const mergedTasks = existingTasksData.tasks.map(task => {
			const taskIdStr = String(task.id);
			if (updatedTasksMap.has(taskIdStr)) {
				// Replace with the updated version
				const updatedTask = updatedTasksMap.get(taskIdStr);
				log.info(`Merging updated task ID: ${taskIdStr}`);
				updatedTasksMap.delete(taskIdStr); // Remove from map to track which were merged
				return updatedTask;
			} else {
				// Keep the existing task
				return task;
			}
		});
		
		// Add any completely new tasks that might have been generated (less common for updates)
        // This shouldn't happen with the current update logic, but good practice
		if (updatedTasksMap.size > 0) {
		    log.warn(`Found ${updatedTasksMap.size} tasks in completion not present in original file. Appending them.`);
		    mergedTasks.push(...updatedTasksMap.values());
            // Sort by ID after adding potentially new tasks
            mergedTasks.sort((a, b) => parseFloat(String(a.id)) - parseFloat(String(b.id)));
		}


		// Write the merged data back
		const finalTasksData = { ...existingTasksData, tasks: mergedTasks };
		writeJSON(tasksJsonPath, finalTasksData);

		log.info(`Successfully merged and saved updated tasks.`);

		// Regenerate task files (optional, depends on workflow)
		try {
			log.info('Regenerating individual task files...');
			// Need to ensure generateTaskFilesDirect exists and works correctly
			// It needs the output directory, derive from tasksJsonPath
			const outputDir = path.dirname(tasksJsonPath); 
			const generateArgs = { tasksJsonPath, output: outputDir, projectRoot };
			await generateTaskFilesDirect(generateArgs, log);
			log.info('Successfully regenerated task files.');
		} catch (genError) {
			log.warn(`Failed to regenerate task files after saving updates: ${genError.message}`);
			// Don't fail the whole operation, just log a warning
		}

		return { success: true, data: { message: `Successfully saved ${updatedTasks.length} updated tasks.` } };

	} catch (error) {
		log.error(`Error saving updated tasks: ${error.message}`);
		log.error(error.stack); // Log stack for debugging
		return { success: false, error: { code: 'SAVE_ERROR', message: `Failed to save updated tasks: ${error.message}` } };
	}
} 