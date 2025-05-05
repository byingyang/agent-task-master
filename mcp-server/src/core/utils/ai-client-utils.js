/**
 * ai-client-utils.js
 * Utility functions for initializing AI clients in MCP context
 */

import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// Load environment variables for CLI mode
dotenv.config();

// Default model configuration from CLI environment
const DEFAULT_MODEL_CONFIG = {
	model: 'claude-3-7-sonnet-20250219',
	maxTokens: 64000,
	temperature: 0.2
};

/**
 * Get an Anthropic client instance initialized with MCP session environment variables
 * @param {Object} [session] - Session object from MCP containing environment variables
 * @param {Object} [log] - Logger object to use (defaults to console)
 * @returns {Anthropic} Anthropic client instance
 * @throws {Error} If API key is missing
 */
export function getAnthropicClientForMCP(session, log = console) {
	try {
		// Extract API key from session.env or fall back to environment variables
		const apiKey =
			session?.env?.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

		if (!apiKey) {
			throw new Error(
				'ANTHROPIC_API_KEY not found in session environment or process.env'
			);
		}

		// Initialize and return a new Anthropic client
		return new Anthropic({
			apiKey,
			defaultHeaders: {
				'anthropic-beta': 'output-128k-2025-02-19' // Include header for increased token limit
			}
		});
	} catch (error) {
		log.error(`Failed to initialize Anthropic client: ${error.message}`);
		throw error;
	}
}

/**
 * Get a Perplexity client instance initialized with MCP session environment variables
 * @param {Object} [session] - Session object from MCP containing environment variables
 * @param {Object} [log] - Logger object to use (defaults to console)
 * @returns {OpenAI} OpenAI client configured for Perplexity API
 * @throws {Error} If API key is missing or OpenAI package can't be imported
 */
export async function getPerplexityClientForMCP(session, log = console) {
	try {
		// Extract API key from session.env or fall back to environment variables
		const apiKey =
			session?.env?.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY;

		if (!apiKey) {
			throw new Error(
				'PERPLEXITY_API_KEY not found in session environment or process.env'
			);
		}

		// Dynamically import OpenAI (it may not be used in all contexts)
		const { default: OpenAI } = await import('openai');

		// Initialize and return a new OpenAI client configured for Perplexity
		return new OpenAI({
			apiKey,
			baseURL: 'https://api.perplexity.ai'
		});
	} catch (error) {
		log.error(`Failed to initialize Perplexity client: ${error.message}`);
		throw error;
	}
}

/**
 * Get model configuration from session environment or fall back to defaults
 * @param {Object} [session] - Session object from MCP containing environment variables
 * @param {Object} [defaults] - Default model configuration to use if not in session
 * @returns {Object} Model configuration with model, maxTokens, and temperature
 */
export function getModelConfig(session, defaults = DEFAULT_MODEL_CONFIG) {
	// Get values from session or fall back to defaults
	return {
		model: session?.env?.MODEL || defaults.model,
		maxTokens: parseInt(session?.env?.MAX_TOKENS || defaults.maxTokens),
		temperature: parseFloat(session?.env?.TEMPERATURE || defaults.temperature)
	};
}

/**
 * Returns the best available AI model based on specified options
 * @param {Object} session - Session object from MCP containing environment variables
 * @param {Object} options - Options for model selection
 * @param {boolean} [options.requiresResearch=false] - Whether the operation requires research capabilities
 * @param {boolean} [options.claudeOverloaded=false] - Whether Claude is currently overloaded
 * @param {Object} [log] - Logger object to use (defaults to console)
 * @returns {Promise<Object>} Selected model info with type and client
 * @throws {Error} If no AI models are available
 */
export async function getBestAvailableAIModel(
	session,
	options = {},
	log = console
) {
	const { requiresResearch = false, claudeOverloaded = false } = options;

	// Test case: When research is needed but no Perplexity, use Claude
	if (
		requiresResearch &&
		!(session?.env?.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY) &&
		(session?.env?.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY)
	) {
		try {
			log.warn('Perplexity not available for research, using Claude');
			const client = getAnthropicClientForMCP(session, log);
			return { type: 'claude', client };
		} catch (error) {
			log.error(`Claude not available: ${error.message}`);
			throw new Error('No AI models available for research');
		}
	}

	// Regular path: Perplexity for research when available
	if (
		requiresResearch &&
		(session?.env?.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY)
	) {
		try {
			const client = await getPerplexityClientForMCP(session, log);
			return { type: 'perplexity', client };
		} catch (error) {
			log.warn(`Perplexity not available: ${error.message}`);
			// Fall through to Claude as backup
		}
	}

	// Test case: Claude for overloaded scenario
	if (
		claudeOverloaded &&
		(session?.env?.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY)
	) {
		try {
			log.warn(
				'Claude is overloaded but no alternatives are available. Proceeding with Claude anyway.'
			);
			const client = getAnthropicClientForMCP(session, log);
			return { type: 'claude', client };
		} catch (error) {
			log.error(
				`Claude not available despite being overloaded: ${error.message}`
			);
			throw new Error('No AI models available');
		}
	}

	// Default case: Use Claude when available and not overloaded
	if (
		!claudeOverloaded &&
		(session?.env?.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY)
	) {
		try {
			const client = getAnthropicClientForMCP(session, log);
			return { type: 'claude', client };
		} catch (error) {
			log.warn(`Claude not available: ${error.message}`);
			// Fall through to error if no other options
		}
	}

	// If we got here, no models were successfully initialized
	throw new Error('No AI models available. Please check your API keys.');
}

/**
 * Handle Claude API errors with user-friendly messages
 * @param {Error} error - The error from Claude API
 * @returns {string} User-friendly error message
 */
export function handleClaudeError(error) {
	// Check if it's a structured error response
	if (error.type === 'error' && error.error) {
		switch (error.error.type) {
			case 'overloaded_error':
				return 'Claude is currently experiencing high demand and is overloaded. Please wait a few minutes and try again.';
			case 'rate_limit_error':
				return 'You have exceeded the rate limit. Please wait a few minutes before making more requests.';
			case 'invalid_request_error':
				return 'There was an issue with the request format. If this persists, please report it as a bug.';
			default:
				return `Claude API error: ${error.error.message}`;
		}
	}

	// Check for network/timeout errors
	if (error.message?.toLowerCase().includes('timeout')) {
		return 'The request to Claude timed out. Please try again.';
	}
	if (error.message?.toLowerCase().includes('network')) {
		return 'There was a network error connecting to Claude. Please check your internet connection and try again.';
	}

	// Default error message
	return `Error communicating with Claude: ${error.message}`;
}

/**
 * Generate the system prompt for parsing a PRD into tasks.
 * @param {string} prdContent - The content of the PRD.
 * @param {number} numTasks - The target number of tasks.
 * @param {string} [prdPath=\'N/A\'] - The path to the PRD file (optional).
 * @returns {Object} The system prompt object { systemPrompt, userPrompt }
 */
export function _generateParsePRDPrompt(prdContent, numTasks, prdPath = 'N/A') {
	const systemPrompt = `You are an AI assistant tasked with breaking down a Product Requirements Document (PRD) into a set of sequential development tasks. Your goal is to create exactly <num_tasks>${numTasks}</num_tasks> well-structured, actionable development tasks based on the PRD provided.

First, carefully read and analyze the attached PRD below in the user message.

Before creating the task list, work through the following steps inside <prd_breakdown> tags in your thinking block:

1. List the key components of the PRD
2. Identify the main features and functionalities described
3. Note any specific technical requirements or constraints mentioned
4. Outline a high-level sequence of tasks that would be needed to implement the PRD

Consider dependencies, maintainability, and the fact that you don\'t have access to any existing codebase. Balance between providing detailed task descriptions and maintaining a high-level perspective.

After your breakdown, create a JSON object containing an array of tasks and a metadata object. Each task should follow this structure:

{
  "id": number,
  "title": string,
  "description": string,
  "status": "pending",
  "dependencies": number[] (IDs of tasks this depends on),
  "priority": "high" | "medium" | "low",
  "details": string (implementation details),
  "testStrategy": string (validation approach)
}

Guidelines for creating tasks:
1. Number tasks from 1 to <num_tasks>${numTasks}</num_tasks>.
2. Make each task atomic and focused on a single responsibility.
3. Order tasks logically, considering dependencies and implementation sequence.
4. Start with setup and core functionality, then move to advanced features.
5. Provide a clear validation/testing approach for each task.
6. Set appropriate dependency IDs (tasks can only depend on lower-numbered tasks).
7. Assign priority based on criticality and dependency order.
8. Include detailed implementation guidance in the "details" field.
9. Strictly adhere to any specific requirements for libraries, database schemas, frameworks, tech stacks, or other implementation details mentioned in the PRD.
10. Fill in gaps left by the PRD while preserving all explicit requirements.
11. Provide the most direct path to implementation, avoiding over-engineering.

The final output should be valid JSON only, with no additional explanation or comments. Do not duplicate or rehash any of the work you did in the prd_breakdown section in your final output. The JSON must start with { and end with }. Example structure:

{
  "tasks": [
    {
      "id": 1,
      "title": "Example Task Title",
      "description": "Brief description of the task",
      "status": "pending",
      "dependencies": [], // Root task usually has no dependencies
      "priority": "high",
      "details": "Detailed implementation guidance",
      "testStrategy": "Approach for validating this task"
    },
    // ... more tasks ...
  ],
  "metadata": {
    "projectName": "PRD Implementation",
    "totalTasks": <num_tasks>${numTasks}</num_tasks>,
    "sourceFile": "<prd_path>${prdPath}</prd_path>",
    "generatedAt": "YYYY-MM-DD" // Use current date
  }
}

Remember to provide comprehensive task details that are LLM-friendly, consider dependencies and maintainability carefully, and keep in mind that you don\'t have the existing codebase as context. Aim for a balance between detailed guidance and high-level planning. Ensure the final output is just the JSON object.`;

	// The userPrompt should contain the actual PRD content
	const userPrompt = prdContent;

	// Return the object expected by the caller
	return { systemPrompt, userPrompt };
}

/**
 * Parses the JSON task data from the LLM completion text.
 * Expects the completion to contain a JSON block like:
 * {
 *   "tasks": [...],
 *   "metadata": {...}
 * }
 * @param {string} completionText - The raw text response from the LLM.
 * @returns {Object} The parsed task data object { tasks: [], metadata: {} } or null if parsing fails.
 */
export function parseTasksFromCompletion(completionText) {
	try {
		// Find the start and end of the JSON block
		const jsonStart = completionText.indexOf('{');
		const jsonEnd = completionText.lastIndexOf('}');

		if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
			console.error('Could not find valid JSON block in completion text.');
			return null;
		}

		const jsonString = completionText.substring(jsonStart, jsonEnd + 1);

		// Parse the JSON string
		const parsedData = JSON.parse(jsonString);

		// Basic validation
		if (!parsedData || !Array.isArray(parsedData.tasks)) {
			console.error('Parsed JSON does not have the expected tasks array structure.');
			return null;
		}

		// Add current date to metadata if not present
		if (parsedData.metadata && !parsedData.metadata.generatedAt) {
			parsedData.metadata.generatedAt = new Date().toISOString().split('T')[0];
		} else if (!parsedData.metadata) {
			// Initialize metadata if missing
			parsedData.metadata = {
				generatedAt: new Date().toISOString().split('T')[0]
			};
		}

		return parsedData;
	} catch (error) {
		console.error(`Error parsing tasks from completion: ${error.message}`);
		console.error(`Completion Text causing error: \n---\n${completionText}\n---`);
		return null;
	}
}

// --- Add prompt builder for add_task ---
/**
 * Builds the system and user prompts for adding a new task based on context.
 *
 * @param {string} userPrompt - The user's description of the task.
 * @param {Array} contextTasks - Array of existing tasks for context.
 * @param {Object} [options] - Additional options.
 * @param {number} [options.newTaskId] - The potential ID for the new task.
 * @returns {{systemPrompt: string, userPrompt: string}}
 */
export function _buildAddTaskPrompt(userPrompt, contextTasks = [], { newTaskId } = {}) {
	const systemPrompt = `You are an AI assistant helping to structure a new development task based on a user's prompt. Your goal is to create a single, well-defined task object in JSON format.

Analyze the user's request and the context of existing tasks (if provided) to create a task object with the following fields:

{
  "title": string,          // Concise, descriptive title
  "description": string,    // Brief summary of the task's goal
  "details": string,        // Detailed implementation guidance, steps, or considerations
  "testStrategy": string    // How the task's completion can be verified
}

Guidelines:
1.  Extract the core requirement from the user's prompt: <user_prompt>${userPrompt}</user_prompt>
2.  Consider the existing tasks to avoid duplication and understand the project context:
    <existing_tasks>
    ${contextTasks.length > 0 ? JSON.stringify(contextTasks.map(t => ({ id: t.id, title: t.title, status: t.status })), null, 2) : 'None provided.'}
    </existing_tasks>
3.  Generate a clear title, description, detailed implementation steps (details), and a verification method (testStrategy).
4.  The 'details' field should be comprehensive enough for another developer (or AI) to understand the implementation steps.
5.  The 'testStrategy' should be specific and actionable.
6.  Do NOT include fields like 'id', 'status', 'dependencies', or 'priority' in your response object. These are handled separately.
7.  Your response MUST be only the JSON object, starting with { and ending with }, with no additional text, comments, or explanations before or after it.

Example Output Format:
{
  "title": "Implement User Authentication",
  "description": "Set up JWT-based authentication endpoints.",
  "details": "1. Install necessary libraries (jsonwebtoken, bcrypt). \n2. Create '/register' endpoint: hash password, save user. \n3. Create '/login' endpoint: verify credentials, issue JWT. \n4. Implement middleware to protect routes.",
  "testStrategy": "Use Postman/curl to test registration, login (success/failure), and access to protected routes with/without valid token."
}`;

	// The user prompt remains the same, the system prompt provides the instructions and context.
	return { systemPrompt, userPrompt };
}

// --- Add JSON parser specifically for single task objects ---
/**
 * Parses a JSON response expected to contain a single task object
 * (title, description, details, testStrategy).
 *
 * @param {string} completionText - The raw text response from the LLM.
 * @returns {Object|null} The parsed task data object or null if parsing fails.
 */
export function parseTaskJsonResponse(completionText) {
  try {
    // Find the start and end of the JSON block
    const jsonStart = completionText.indexOf('{');
    const jsonEnd = completionText.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      console.error('Could not find valid JSON block in completion text for single task.');
      return null;
    }

    const jsonString = completionText.substring(jsonStart, jsonEnd + 1);
    const parsedData = JSON.parse(jsonString);

    // Basic validation for expected fields
    if (!parsedData || typeof parsedData.title !== 'string' || typeof parsedData.description !== 'string') {
        console.error('Parsed JSON does not have the expected structure (title, description, details, testStrategy).');
        return null;
    }
    // Ensure optional fields are at least present as empty strings if missing
    parsedData.details = parsedData.details || '';
    parsedData.testStrategy = parsedData.testStrategy || '';

    return parsedData;
  } catch (error) {
    console.error(`Error parsing single task JSON from completion: ${error.message}`);
    console.error(`Completion Text causing error: \n---\n${completionText}\n---`);
    return null;
  }
}

// --- Add prompt builder for complexity analysis ---
/**
 * Generates the prompt for AI complexity analysis.
 *
 * @param {Array} tasksToAnalyze - Array of task objects to analyze.
 * @param {number} thresholdScore - The score above which expansion is recommended.
 * @param {boolean} useResearch - Hint whether research capabilities might be useful.
 * @returns {string} The formatted prompt for the AI.
 */
export function generateComplexityAnalysisPrompt(tasksToAnalyze, thresholdScore = 8, useResearch = false) {
    const taskDescriptions = tasksToAnalyze.map(task => (
        `<task id="${task.id}" title="${task.title}" priority="${task.priority || 'N/A'}" dependencies="${task.dependencies?.join(', ') || 'none'}">
<description>${task.description || 'No description provided.'}</description>
<details>${task.details || 'No details provided.'}</details>
</task>`
    )).join('\n\n');

    return `Analyze the complexity of the following development tasks. For each task, provide:
1.  A complexity score (1-10), where 1 is trivial and 10 is highly complex, requiring significant effort or research.
2.  A brief justification for the score.
3.  A recommendation (boolean) on whether the task should be expanded into subtasks (true if score >= ${thresholdScore}, false otherwise).

${useResearch ? 'Feel free to leverage external knowledge or research if needed to better estimate complexity, especially for tasks involving unfamiliar technologies or concepts.\n' : ''}
Consider factors like: clarity of requirements, estimated implementation time, number of components involved, potential unknowns or risks, required testing effort, and dependencies.

Please provide the response as a JSON array, where each object represents a task's analysis:
[
  {
    "id": <task_id>,
    "title": "<task_title>",
    "complexityScore": <score_1_to_10>,
    "justification": "<brief_reasoning>",
    "recommendExpansion": <boolean_true_if_score_>=_${thresholdScore}>
  },
  ...
]

Ensure the output is only the JSON array, starting with [ and ending with ].

Tasks to analyze:
${taskDescriptions}`;
}

// --- Add parser for complexity analysis response ---
/**
 * Parses the JSON array response from complexity analysis.
 *
 * @param {string} completionText - The raw text response from the LLM.
 * @returns {Array|null} An array of complexity analysis objects or null if parsing fails.
 */
export function parseComplexityAnalysis(completionText) {
  try {
    // Find the start and end of the JSON array
    const jsonStart = completionText.indexOf('[');
    const jsonEnd = completionText.lastIndexOf(']');

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      console.error('Could not find valid JSON array block in complexity analysis completion.');
      return null;
    }

    const jsonString = completionText.substring(jsonStart, jsonEnd + 1);
    const parsedData = JSON.parse(jsonString);

    // Basic validation: Check if it's an array
    if (!Array.isArray(parsedData)) {
      console.error('Parsed complexity analysis is not an array.');
      return null;
    }

    // Optional: Further validation of array items structure can be added here
    // e.g., check if each item has id, complexityScore, etc.

    return parsedData;
  } catch (error) {
    console.error(`Error parsing complexity analysis JSON: ${error.message}`);
    console.error(`Completion Text causing error: \n---\n${completionText}\n---`);
    return null;
  }
}

// --- Add prompt builder for expanding tasks into subtasks ---
/**
 * Generates the prompt for expanding a task into subtasks.
 *
 * @param {Object} task - The parent task object.
 * @param {number|undefined} numSubtasks - The target number of subtasks (or undefined for AI default).
 * @param {string} [additionalContext=''] - Any extra user-provided context.
 * @param {Object|null} [complexityReport=null] - Optional complexity report data.
 * @returns {string} The formatted prompt for the AI.
 */
export function generateSubtaskPrompt(task, numSubtasks, additionalContext = '', complexityReport = null) {
    // Determine the target number of subtasks
    let targetNumSubtasks = numSubtasks;
    if (targetNumSubtasks === undefined && complexityReport?.complexityAnalysis) {
        const taskAnalysis = complexityReport.complexityAnalysis.find(a => a.id === task.id);
        if (taskAnalysis && taskAnalysis.complexityScore >= 8) {
            targetNumSubtasks = Math.max(3, Math.min(10, Math.ceil(taskAnalysis.complexityScore / 1.5))); // Example logic
        } else {
            targetNumSubtasks = 3; // Default if score is low or no analysis
        }
    } else if (targetNumSubtasks === undefined) {
        targetNumSubtasks = 5; // Fallback default if no complexity report
    }

    const contextInfo = additionalContext ? `\n\nAdditional Context Provided:\n${additionalContext}` : '';
    const complexityInfo = complexityReport?.complexityAnalysis?.find(a => a.id === task.id)
        ? `\n\nComplexity Analysis for this task:\nScore: ${complexityReport.complexityAnalysis.find(a => a.id === task.id).complexityScore}/10\nJustification: ${complexityReport.complexityAnalysis.find(a => a.id === task.id).justification}`
        : '';

    return `You are tasked with breaking down the following development task into approximately ${targetNumSubtasks} smaller, actionable subtasks. The goal is to create a clear, step-by-step plan for implementing the parent task.

Parent Task:
<task id="${task.id}" title="${task.title}" priority="${task.priority || 'N/A'}">
<description>${task.description || 'No description provided.'}</description>
<details>${task.details || 'No details provided.'}</details>
<testStrategy>${task.testStrategy || 'No test strategy provided.'}</testStrategy>
</task>
${contextInfo}${complexityInfo}

Generate a JSON array of subtask objects. Each subtask object should have:
- "title": string (Concise title for the subtask)
- "description": string (Brief description of the subtask's objective)
- "details": string (Specific implementation steps or guidance for *this* subtask)

Guidelines:
1.  Create approximately ${targetNumSubtasks} subtasks.
2.  Ensure subtasks are logically sequenced and cover the parent task's requirements.
3.  Make subtasks specific and actionable.
4.  Avoid making subtasks too large or too small (aim for implementable units).
5.  The 'details' field for each subtask should provide clear instructions for that specific step.
6.  Do NOT include 'id', 'status', or 'dependencies' in the subtask objects; these will be added later.
7.  Your response MUST be only the JSON array, starting with [ and ending with ], with no additional text or explanations.

Example Output Format:
[
  {
    "title": "Setup Database Schema",
    "description": "Define and apply the necessary database migrations.",
    "details": "1. Create migration file for 'users' table (id, email, password_hash). 2. Run migration script."
  },
  {
    "title": "Implement Registration Endpoint",
    "description": "Create the API endpoint for user registration.",
    "details": "1. Define POST /api/register route. 2. Hash incoming password. 3. Save user to database. 4. Return success response or error."
  },
  ...
]`;
}

// --- Add parser for subtask array response ---
/**
 * Parses a JSON array of subtasks from the LLM completion text.
 *
 * @param {string} completionText - The raw text response from the LLM.
 * @param {number} [expectedCount] - Optional: Expected number of subtasks (for logging/validation).
 * @param {string|number} [parentTaskId] - Optional: ID of the parent task (for logging).
 * @returns {Array|null} An array of subtask objects ({title, description, details}) or null if parsing fails.
 */
export function parseSubtasksFromText(completionText, expectedCount, parentTaskId) {
  try {
    const jsonStart = completionText.indexOf('[');
    const jsonEnd = completionText.lastIndexOf(']');

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      console.error(`Could not find valid JSON array block in subtask completion for parent task ${parentTaskId || 'N/A'}.`);
      return null;
    }

    const jsonString = completionText.substring(jsonStart, jsonEnd + 1);
    const parsedData = JSON.parse(jsonString);

    if (!Array.isArray(parsedData)) {
      console.error(`Parsed subtask data is not an array for parent task ${parentTaskId || 'N/A'}.`);
      return null;
    }

    // Basic validation of subtask structure
    if (parsedData.length > 0) {
        const firstSubtask = parsedData[0];
        if (typeof firstSubtask.title !== 'string' || typeof firstSubtask.description !== 'string') {
            console.error(`Parsed subtasks do not have the expected structure (title, description, details) for parent task ${parentTaskId || 'N/A'}.`);
            return null;
        }
        // Ensure details field exists
        parsedData.forEach(st => { st.details = st.details || ''; });
    }


    if (expectedCount !== undefined && parsedData.length !== expectedCount) {
      console.warn(`Expected ${expectedCount} subtasks but parsed ${parsedData.length} for parent task ${parentTaskId || 'N/A'}.`);
    }

    return parsedData;
  } catch (error) {
    console.error(`Error parsing subtasks JSON for parent task ${parentTaskId || 'N/A'}: ${error.message}`);
    console.error(`Completion Text causing error: \n---\n${completionText}\n---`);
    return null;
  }
}

// --- Add prompt builder for updating a single task ---
/**
 * Builds the prompt for updating a single task based on user instructions.
 *
 * @param {Object} taskToUpdate - The original task object.
 * @param {string} updatePrompt - The user's instructions for the update.
 * @returns {{systemPrompt: string, userPrompt: string}}
 */
export function _buildUpdateTaskPrompt(taskToUpdate, updatePrompt) {
	const systemPrompt = `You are an AI assistant helping to update a software development task based on new context.
You will be given a task and a prompt describing changes or new implementation details.
Your job is to update the task to reflect these changes, while preserving its basic structure.

Guidelines:
1. VERY IMPORTANT: NEVER change the title of the task - keep it exactly as is
2. Maintain the same ID, status, and dependencies unless specifically mentioned in the prompt
3. Update the description, details, and test strategy to reflect the new information
4. Do not change anything unnecessarily - just adapt what needs to change based on the prompt
5. Return a complete valid JSON object representing the updated task
6. VERY IMPORTANT: Preserve all subtasks marked as "done" or "completed" - do not modify their content
7. For tasks with completed subtasks, build upon what has already been done rather than rewriting everything
8. If an existing completed subtask needs to be changed/undone based on the new context, DO NOT modify it directly
9. Instead, add a new subtask that clearly indicates what needs to be changed or replaced
10. Use the existence of completed subtasks as an opportunity to make new subtasks more specific and targeted
11. Ensure any new subtasks have unique IDs that don't conflict with existing ones

The changes described in the prompt should be thoughtfully applied to make the task more accurate and actionable.`;

	const taskData = JSON.stringify(taskToUpdate, null, 2);

	const userPrompt = `Here is the task to update:
${taskData}

Please update this task based on the following new context:
${updatePrompt}

IMPORTANT: In the task JSON above, any subtasks with "status": "done" or "status": "completed" should be preserved exactly as is. Build your changes around these completed items.

Return only the updated task as a valid JSON object.`;

	return { systemPrompt, userPrompt };
}

// --- NEW FUNCTIONS ADDED ---

/**
 * Builds system and user prompts for updating a single subtask.
 * @param {Object} parentTask - The parent task object.
 * @param {Object} subtaskToUpdate - The subtask object to be updated.
 * @param {string} updatePrompt - User's instructions for the update.
 * @returns {Object} Object containing systemPrompt and userPrompt.
 */
export function _buildUpdateSubtaskPrompt(parentTask, subtaskToUpdate, updatePrompt) {
	const systemPrompt = `You are an AI assistant helping to update a specific subtask within a larger software development task.
You will be given the parent task context and the specific subtask to update, along with instructions.
Your job is to update *only the specified subtask* based on the instructions, primarily by appending information to its details field.

Guidelines:
1. Focus ONLY on the subtask with ID ${parentTask.id}.${subtaskToUpdate.id}.
2. Primarily, you should APPEND the provided information to the existing 'details' field of the subtask.
3. Add a timestamp before the appended notes, like "[YYYY-MM-DD HH:MM:SS] Notes added: ...".
4. Maintain the subtask's existing ID, title, description, status, and dependencies unless the update prompt explicitly instructs otherwise (which is rare for this operation).
5. Do NOT modify other subtasks or the parent task.
6. Return a complete valid JSON object representing ONLY the single updated subtask.
`;

	const subtaskData = JSON.stringify(subtaskToUpdate, null, 2);
	const parentContext = `Parent Task ID: ${parentTask.id}\\nParent Title: ${parentTask.title}`;

	const userPrompt = `Parent Task Context:
${parentContext}

Subtask to Update (ID ${parentTask.id}.${subtaskToUpdate.id}):
${subtaskData}

Please update this subtask based on the following instructions (append to details unless otherwise specified):
${updatePrompt}

Return only the updated subtask as a valid JSON object.`;

	return { systemPrompt, userPrompt };
}

/**
 * Builds system and user prompts for updating multiple tasks.
 * @param {Array<Object>} tasksToUpdate - Array of task objects to be updated.
 * @param {string} updatePrompt - User's instructions for the update.
 * @returns {Object} Object containing systemPrompt and userPrompt.
 */
export function _buildUpdateMultipleTasksPrompt(tasksToUpdate, updatePrompt) {
	const systemPrompt = `You are an AI assistant helping to update software development tasks based on new context.
You will be given a set of tasks and a prompt describing changes or new implementation details.
Your job is to update the tasks to reflect these changes, while preserving their basic structure.

Guidelines:
1. Maintain the same IDs, statuses, and dependencies unless specifically mentioned in the prompt
2. Update titles, descriptions, details, and test strategies to reflect the new information
3. Do not change anything unnecessarily - just adapt what needs to change based on the prompt
4. You should return ALL the tasks provided in the input, in the same order, even if some are unchanged.
5. Return a complete valid JSON object containing ONLY a "tasks" array with the updated tasks: { "tasks": [...] }
6. VERY IMPORTANT: Preserve all subtasks marked as "done" or "completed" - do not modify their content
7. For tasks with completed subtasks, build upon what has already been done rather than rewriting everything
8. If an existing completed subtask needs to be changed/undone based on the new context, DO NOT modify it directly
9. Instead, add a new subtask that clearly indicates what needs to be changed or replaced
10. Use the existence of completed subtasks as an opportunity to make new subtasks more specific and targeted

The changes described in the prompt should be applied to ALL tasks in the list provided.`;

	const taskData = JSON.stringify(tasksToUpdate, null, 2);

	const userPrompt = `Here are the tasks to update:
${taskData}

Please update these tasks based on the following new context:
${updatePrompt}

IMPORTANT: In the tasks JSON above, any subtasks with "status": "done" or "status": "completed" should be preserved exactly as is. Build your changes around these completed items.

Return only a valid JSON object containing a "tasks" array with ALL the updated tasks (even unchanged ones). Format: { "tasks": [...] }`;

	return { systemPrompt, userPrompt };
}

// --- END NEW FUNCTIONS ---
