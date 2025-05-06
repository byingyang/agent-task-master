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
import { analyzeTaskComplexityDirect } from '../core/task-master-core.js';
import { findTasksJsonPath } from '../core/utils/path-utils.js';
import { readJSON } from '../../../scripts/modules/utils.js';
import path from 'path';
import fs from 'fs';
import {
	generateComplexityAnalysisPrompt,
	parseComplexityAnalysis
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
					tasksData = readJSON(tasksJsonPath, log);
				} catch (error) {
					log.error(`Error finding or reading tasks.json: ${error.message}`);
					return createErrorResponse(
						`Failed to find or read tasks.json: ${error.message}`
					);
				}

				const outputPath = args.output
					? path.resolve(rootFolder, args.output)
					: path.resolve(rootFolder, 'scripts', 'task-complexity-report.json');

				const { systemPrompt, userPrompt } = generateComplexityAnalysisPrompt(
					tasksData.tasks,
					parseFloat(args.threshold || '5'),
					args.research
				);
				if (!userPrompt) {
					return createErrorResponse('Failed to generate prompt for complexity analysis.');
				}

				log.info('Initiating client-side LLM sampling via context.sample for complexity analysis...');
				let completion;
				try {
					if (typeof session.requestSampling !== 'function') {
						throw new Error('FastMCP sampling function (session.requestSampling) is not available.');
					}
					completion = await session.requestSampling({
						messages: [{ role: 'user', content: { type: 'text', text: userPrompt } }],
						systemPrompt: systemPrompt,
					});
				} catch (sampleError) {
					log.error(`session.requestSampling failed: ${sampleError.message}`);
					return createErrorResponse(`Client-side sampling failed: ${sampleError.message}`);
				}

				const completionText = completion?.content;
				if (!completionText) {
					log.error('Received empty completion from session.requestSampling.');
					return createErrorResponse('Received empty completion from client LLM.');
				}
				log.info(`Received complexity analysis completion from client LLM.`);

				const analysisReport = parseComplexityAnalysis(completionText);
				if (!analysisReport || !Array.isArray(analysisReport.complexityAnalysis)) {
					log.error('Failed to parse valid complexity analysis report from LLM completion.');
					return createErrorResponse('Failed to parse valid complexity analysis report from LLM completion.');
				}
				log.info(`Parsed complexity analysis report with ${analysisReport.complexityAnalysis.length} entries.`);

				// Prepare args for analyzeTaskComplexityDirect
				const directArgs = {
					tasksJsonPath,
					outputPath,
					projectRoot: rootFolder,
					model: args.model,
					threshold: args.threshold,
					research: args.research
				};

				// Call analyzeTaskComplexityDirect, passing session for sampling
				const result = await analyzeTaskComplexityDirect(directArgs, log, { session });

				return handleApiResult(result, log, 'Error analyzing project complexity');
			} catch (error) {
				log.error(`Unhandled error in analyze_project_complexity tool: ${error.message}`);
				log.error(error.stack);
				return createErrorResponse(`Internal server error during complexity analysis: ${error.message}`);
			}
		}
	});
}
