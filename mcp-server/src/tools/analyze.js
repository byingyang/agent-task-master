/**
 * tools/analyze.js
 * Tool for analyzing task complexity and generating recommendations
 */

import { z } from 'zod';
import {
	handleApiResult,
	createErrorResponse,
	getProjectRootFromSession
} from './utils.js';
import { saveComplexityReportDirect } from '../core/task-master-core.js';
import { findTasksJsonPath, readTasks } from '../core/utils/path-utils.js';
import path from 'path';
import fs from 'fs';
import {
	_generateAnalyzeComplexityPrompt,
	parseComplexityReportFromCompletion
} from '../core/utils/ai-client-utils.js';

/**
 * Register the analyze tool with the MCP server
 * @param {Object} server - FastMCP server instance
 */
export function registerAnalyzeTool(server) {
	server.addTool({
		name: 'analyze_project_complexity',
		description:
			'Analyze task complexity and generate expansion recommendations using client-side LLM sampling.',
		parameters: z.object({
			output: z
				.string()
				.optional()
				.describe(
					'Output file path for the report (default: scripts/task-complexity-report.json)'
				),
			model: z
				.string()
				.optional()
				.describe(
					'LLM model hint for client (defaults to client configuration)'
				),
			threshold: z.coerce
				.number()
				.min(1)
				.max(10)
				.optional()
				.describe(
					'Minimum complexity score to recommend expansion (1-10) (default: 5)'
				),
			file: z
				.string()
				.optional()
				.describe(
					'Absolute path to the tasks file (default: tasks/tasks.json)'
				),
			research: z
				.boolean()
				.optional()
				.describe('Hint for client LLM to use research capabilities'),
			projectRoot: z
				.string()
				.optional()
				.describe('The directory of the project. Must be an absolute path. If not provided, derived from session.')
		}),
		execute: async (args, context) => {
			const { log, session } = context;
			try {
				log.info(
					`Analyzing task complexity with args: ${JSON.stringify(args)}`
				);

				const rootFolder =
					args.projectRoot || getProjectRootFromSession(session, log);

				if (!rootFolder) {
					return createErrorResponse('Could not determine project root.');
				}

				let tasksJsonPath;
				let tasksData;
				try {
					tasksJsonPath = findTasksJsonPath(
						{ projectRoot: rootFolder, file: args.file },
						log
					);
					tasksData = readTasks(tasksJsonPath, log);
				} catch (error) {
					log.error(`Error finding or reading tasks.json: ${error.message}`);
					return createErrorResponse(
						`Failed to find or read tasks.json: ${error.message}`
					);
				}

				const outputPath = args.output
					? path.resolve(rootFolder, args.output)
					: path.resolve(rootFolder, 'scripts', 'task-complexity-report.json');

				const { systemPrompt, userPrompt } = _generateAnalyzeComplexityPrompt(
					tasksData.tasks,
					args.threshold || 5,
					args.research
				);
				if (!userPrompt) {
					return createErrorResponse('Failed to generate prompt for complexity analysis.');
				}

				log.info('Initiating client-side LLM sampling via context.sample for complexity analysis...');
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
				log.info('Received complexity analysis completion from client LLM.');

				const reportData = parseComplexityReportFromCompletion(completionText);
				if (!reportData) {
					log.error('Failed to parse valid complexity report from LLM completion.');
					return createErrorResponse('Failed to parse valid complexity report from LLM completion.');
				}
				log.info('Parsed complexity report from completion.');

				const saveArgs = {
					outputPath,
					reportData,
					projectRoot: rootFolder
				};
				const result = await saveComplexityReportDirect(saveArgs, log);

				if (result.success) {
					log.info(`Task complexity analysis report saved successfully.`);
				} else {
					log.error(`Failed to save task complexity report: ${result.error?.message || 'Unknown error'}`);
				}

				return handleApiResult(result, log, 'Error saving task complexity report');
			} catch (error) {
				log.error(`Unhandled error in analyze_project_complexity tool: ${error.message}`);
				log.error(error.stack);
				return createErrorResponse(`Internal server error during complexity analysis: ${error.message}`);
			}
		}
	});
}
