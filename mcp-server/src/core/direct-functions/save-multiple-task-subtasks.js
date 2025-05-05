/**
 * mcp-server/src/core/direct-functions/save-multiple-task-subtasks.js
 * Direct function wrapper to save subtasks for multiple parent tasks.
 */

import { readJSON, writeJSON } from '../../../../scripts/modules/utils.js';
import { generateTaskFilesDirect } from './generate-task-files.js';
import path from 'path';

/**
 * Saves generated subtasks for multiple parent tasks to tasks.json.
 *
 * @param {Object} args - Arguments object.
 * @param {string} args.tasksJsonPath - Absolute path to the tasks.json file.
 * @param {string} args.projectRoot - Absolute path to the project root.
 * @param {Array<{taskId: string|number, subtasks: Array<Object>}>} args.subtaskUpdates - Array of updates.
 * @param {boolean} [args.force=false] - Whether to overwrite existing subtasks.
 * @param {Object} log - Logger object.
 * @returns {Promise<Object>} - Standard success/error object.
 */
export async function saveMultipleTaskSubtasksDirect(args, log) {
    const { tasksJsonPath, projectRoot, subtaskUpdates, force = false } = args;

    if (!tasksJsonPath || !projectRoot || !Array.isArray(subtaskUpdates)) {
        const message = 'Missing required arguments: tasksJsonPath, projectRoot, or subtaskUpdates array.';
        log.error(message);
        return { success: false, error: { code: 'MISSING_ARGS', message } };
    }

    log.info(`Saving subtask updates for ${subtaskUpdates.length} parent tasks to ${tasksJsonPath}`);

    try {
        // Read existing tasks data
        const existingTasksData = readJSON(tasksJsonPath);
        if (!existingTasksData || !Array.isArray(existingTasksData.tasks)) {
            throw new Error('Failed to read or parse existing tasks.json.');
        }

        let updatedCount = 0;
        let skippedCount = 0;

        // Create a map of existing tasks for efficient updates
        const taskMap = new Map(existingTasksData.tasks.map((task, index) => [String(task.id), { task, index }]));

        for (const update of subtaskUpdates) {
            const { taskId, subtasks } = update;
            const taskIdStr = String(taskId);

            if (taskMap.has(taskIdStr)) {
                const { task: parentTask, index: parentTaskIndex } = taskMap.get(taskIdStr);

                if (parentTask.subtasks && parentTask.subtasks.length > 0 && !force) {
                    log.warn(`Task ${taskIdStr} already has subtasks. Skipping update (use --force to overwrite).`);
                    skippedCount++;
                    continue; // Skip this update
                }

                // Assign/Overwrite subtasks
                parentTask.subtasks = subtasks.map((sub, index) => ({ 
                    ...sub, 
                    id: index + 1 // Ensure sequential IDs
                }));
                log.info(`Assigned ${parentTask.subtasks.length} new subtasks to task ${taskIdStr}. Force: ${force}`);

                // Update the task in the original array using the index
                existingTasksData.tasks[parentTaskIndex] = parentTask;
                updatedCount++;

            } else {
                log.warn(`Parent task with ID ${taskIdStr} not found during multi-save. Skipping.`);
                skippedCount++;
            }
        }

        // Write the potentially modified data back
        writeJSON(tasksJsonPath, existingTasksData);
        log.info(`Successfully saved subtask updates for ${updatedCount} tasks. Skipped ${skippedCount}.`);

        // Regenerate task files if any updates were made
        if (updatedCount > 0) {
            try {
                log.info('Regenerating individual task files...');
                const outputDir = path.dirname(tasksJsonPath);
                const generateArgs = { tasksJsonPath, output: outputDir, projectRoot };
                await generateTaskFilesDirect(generateArgs, log);
                log.info('Successfully regenerated task files.');
            } catch (genError) {
                log.warn(`Failed to regenerate task files after saving multiple subtasks: ${genError.message}`);
            }
        }

        return { 
            success: true, 
            data: { 
                message: `Successfully saved subtask updates for ${updatedCount} tasks. Skipped ${skippedCount}.`,
                updatedCount,
                skippedCount
            }
        };

    } catch (error) {
        log.error(`Error saving multiple subtasks: ${error.message}`);
        log.error(error.stack);
        return { success: false, error: { code: 'SAVE_MULTI_SUBTASK_ERROR', message: `Failed to save multiple subtasks: ${error.message}` } };
    }
} 