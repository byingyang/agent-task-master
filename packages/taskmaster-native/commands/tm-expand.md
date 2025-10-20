---
description: Break down a complex task into subtasks using AI
argument-hint: <task-id>
---

Use Claude Code's AI to intelligently break down a complex task into manageable subtasks.

Arguments: $ARGUMENTS (required: task ID to expand, e.g., "1" or "2")

## Expand Task Process

1. **Parse arguments**
   - Extract task ID
   - If not provided, suggest `/tm:list` to see available tasks

2. **Check initialization**
   - Use Read tool to verify `.taskmaster/tasks/tasks.json` exists
   - If not, suggest running `/tm:init` first

3. **Read and find task**
   - Use Read tool to load `.taskmaster/tasks/tasks.json`
   - Parse JSON and locate task with matching ID
   - If task not found, show error with available IDs

4. **Check if task already has subtasks**
   - If task already has subtasks, ask if user wants to:
     * Add more subtasks
     * Replace existing subtasks
     * Cancel operation

5. **Analyze task with Claude**
   Prompt Claude to break down the task:

   ```
   Analyze this task and break it down into logical, manageable subtasks.

   Task Details:
   - Title: <task-title>
   - Description: <task-description>
   - Details: <task-details>
   - Test Strategy: <test-strategy>

   Generate subtasks that:
   1. Are specific and actionable
   2. Follow a logical implementation order
   3. Are reasonably sized (can be completed in a few hours)
   4. Have clear completion criteria
   5. Include necessary testing steps

   Consider:
   - Technical dependencies between subtasks
   - Best practices for this type of work
   - Testing and validation needs
   - Documentation requirements

   Output as JSON array of subtask objects:
   {
     "title": "string",
     "description": "string",
     "details": "string (optional)",
     "testStrategy": "string (optional)"
   }

   Aim for 3-7 subtasks. If the task is very complex, suggest 5-7 subtasks.
   If it's moderately complex, suggest 3-5 subtasks.
   ```

6. **Parse Claude's response**
   - Extract JSON array of subtasks
   - Validate subtask structure
   - Assign subtask IDs (e.g., if parent is "1", subtasks are "1.1", "1.2", "1.3")
   - Set all subtasks to "pending" status
   - Set priority to match parent task

7. **Update parent task**
   - Add subtasks array to parent task
   - Set dependencies appropriately (each subtask may depend on previous)

8. **Write updated tasks**
   - Use Write tool to save modified tasks.json
   - Preserve all other task data

9. **Confirm expansion**
   Display summary:
   ```
   ✅ Task #1 expanded successfully!

   Created 5 subtasks:
   [1.1] Set up authentication database schema (pending)
   [1.2] Implement password hashing with bcrypt (pending)
   [1.3] Create JWT token generation (pending)
   [1.4] Build login/logout endpoints (pending)
   [1.5] Add refresh token mechanism (pending)

   Suggested implementation order:
   1. Start with /tm:show 1.1 to see first subtask details
   2. Use /tm:status 1.1 in-progress when you begin
   3. Use /tm:status 1.1 done when complete
   4. Move to next subtask

   Quick start: /tm:status 1.1 in-progress
   ```

10. **Smart suggestions**
    - Suggest starting with first subtask
    - Mention that completing all subtasks completes parent task
    - Recommend `/tm:next` for intelligent task suggestions

## When to Expand Tasks

Expand a task when:
- It seems too large to tackle in one session
- It involves multiple distinct steps
- It has unclear implementation path
- You need to break it down for team distribution
- It's marked as high complexity

## Examples

```bash
# Expand a specific task
/tm:expand 1

# Will prompt Claude to analyze and break down the task
# Creates subtasks 1.1, 1.2, 1.3, etc.
```

## Tips

- More detailed parent tasks generate better subtasks
- Claude considers technical dependencies automatically
- Subtasks inherit parent's priority
- You can expand subtasks further (e.g., expand 1.2 into 1.2.1, 1.2.2)
