# PRD: Refactoring MCP Tools for Client-Side LLM Execution

**Author:** Brad Yinger (brad.yinger@tatari.tv)
**Date:** 2023-10-27 (Updated 2024-07-19)
**Status:** Proposed

## 1. Overview

This document outlines the requirements for refactoring existing AI-driven tools within the Task Master MCP (Model Context Protocol) server. MCP provides a standardized way for external clients (like AI agents or integrated development environments) to interact with services, allowing them to retrieve context (data, prompts) and execute tools (functions).

The goal is to leverage the connected client's LLM capabilities for tasks like task generation, expansion, and updates, rather than the server performing these calls directly. This improves efficiency and aligns with the capabilities of modern MCP clients.

**Core Principle:** When Taskmaster operates as an MCP server, it should **leverage the connected client's LLM capabilities** via the FastMCP LLM Sampling mechanism ([https://github.com/jlowin/fastmcp?tab=readme-ov-file#llm-sampling](https://github.com/jlowin/fastmcp?tab=readme-ov-file#llm-sampling)). The server itself should **not** make external LLM calls (e.g., to Claude or Perplexity) for operations initiated via MCP tools. Instead, the tools will use sampling to delegate the LLM execution to the client.

## 2. Problem Statement

Currently, the core logic for several Task Master commands (e.g., `parse-prd`, `add-task`, `expand`, `update`) makes direct calls to external LLMs (like Claude or Perplexity). When these commands are exposed as MCP tools, this server-side LLM execution is:

1.  **Redundant:** Modern MCP clients (like Cursor) have their own powerful LLM capabilities.
2.  **Inefficient:** It requires the server to manage API keys and potentially incur costs that the client could handle.
3.  **Inflexible:** It prevents the client from using its preferred models or applying custom logic around the LLM call.

Furthermore, the previous approach considered creating separate tools just to retrieve prompts, which is not the standard or recommended way to handle client-side LLM execution with FastMCP.

## 3. Proposed Solution: FastMCP LLM Sampling

We will refactor the existing AI-driven MCP tools and their underlying direct functions (`*Direct`) to utilize the **FastMCP LLM Sampling** feature.

1.  **Identify AI-Driven Tools:** Pinpoint the MCP tools that correspond to commands involving LLM interaction (e.g., `parse_prd`, `add_task`, `expand_task`, `update_task`, `analyze_project_complexity`).
2.  **Refactor Direct Functions:** Modify the underlying `*Direct` functions (e.g., `parsePRDDirect`, `addTaskDirect`, `expandTaskDirect`) called by these MCP tools.
    *   These functions will **construct the necessary prompt** based on input arguments and task context.
    *   Instead of calling an external LLM API directly, they will use the **FastMCP sampling mechanism** (e.g., `mcp.llm.complete(...)` or similar, accessible via the passed context/session) to send the prompt to the connected client's LLM.
    *   They will **receive the LLM's completion result** back from the FastMCP framework.
    *   They will then **process this result** (e.g., parse the generated JSON, validate data) and proceed with the rest of the tool's logic (e.g., saving the new task using a `save_*` function/tool).
3.  **Update MCP Tool Wrappers:** Ensure the MCP tool definitions in `mcp-server/src/tools/` correctly pass the necessary context (including the `session` needed for sampling) to their respective `*Direct` functions.
4.  **Remove Server-Side Calls:** Eliminate direct `Anthropic` or `Perplexity` API calls from the `*Direct` functions when invoked via MCP.
5.  **Optional API Keys:** Reiterate that external LLM API keys (`ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`) become optional for the server when operating in MCP mode, as the client handles the LLM execution. The server might still need them for direct CLI operations.

This approach centralizes the LLM execution on the client side while allowing the server to control the prompt generation and result processing, fitting seamlessly into the existing tool execution flow.

## 4. Requirements: Modification of Existing Tools

The following *existing* MCP tools (and crucially, their underlying `*Direct` functions) require refactoring to implement the FastMCP LLM Sampling strategy described above:

*   **`mcp_taskmaster-ai_parse_prd`** (and `parsePRDDirect`)
*   **`mcp_taskmaster-ai_add_task`** (and `addTaskDirect`)
*   **`mcp_taskmaster-ai_expand_task`** (and `expandTaskDirect`)
*   **`mcp_taskmaster-ai_expand_all`** (and `expandAllDirect`)
*   **`mcp_taskmaster-ai_update_task`** (and `updateTaskByIdDirect`)
*   **`mcp_taskmaster-ai_update_subtask`** (and `updateSubtaskByIdDirect`)
*   **`mcp_taskmaster-ai_update`** (corresponding to `update-multiple-tasks`, and `updateTasksDirect`)
*   **`mcp_taskmaster-ai_analyze_project_complexity`** (and `analyzeComplexityDirect`)

These functions must:
1.  Generate the appropriate prompt internally.
2.  Use the FastMCP sampling mechanism to get the completion from the client LLM.
3.  Process the result and perform subsequent actions (like saving data).
4.  Avoid making direct server-side calls to external LLMs when invoked via MCP.

## 5. Non-Goals

*   Creating new `get_*_prompt` tools (this approach is superseded by sampling).
*   Changing the *content* of the prompts generated, only *how* they are executed via MCP.
*   Modifying the `save_*` tools/functions (they still expect structured data, now generated via the client's LLM through sampling).
*   Removing server-side LLM capabilities entirely (they might still be used for direct CLI operation, though consistency should be considered).

## 6. Future Considerations

*   Ensuring consistent behavior or clear distinctions between direct CLI execution (potentially server-side LLM) and MCP execution (client-side LLM via sampling).
*   Updating documentation ([`mcp.mdc`](mdc:.cursor/rules/mcp.mdc), [`taskmaster.mdc`](mdc:.cursor/rules/taskmaster.mdc)) to accurately reflect the sampling-based workflow for relevant tools.

## 7. Acceptance Criteria

*   The MCP tools listed in Section 4 are refactored to use the FastMCP LLM Sampling mechanism via their underlying `*Direct` functions.
*   Server-side calls to external LLMs (Anthropic, Perplexity) are removed from the MCP execution path for these tools.
*   Agents (like Cursor) can successfully invoke these tools (e.g., `add_task`, `expand_task`), triggering the client-side LLM via sampling to generate the required data.
*   The tools correctly process the results from the client LLM completion and perform necessary follow-up actions (e.g., saving tasks).
*   External LLM API keys are confirmed to be optional for server operation when interacting solely via MCP.
*   Relevant MCP server documentation is updated to reflect the use of LLM sampling for these tools.