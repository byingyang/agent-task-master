---
description: Add a new task to the project
argument-hint: [task-description]
---

Add a new task to the Task Master project.

Arguments: $ARGUMENTS (optional: brief task description to get started)

## Add Task Process

1. **Check initialization**
   - Use Read tool to verify `.taskmaster/tasks/tasks.json` exists
   - If not, suggest running `/tm:init` first

2. **Gather task information**
   If arguments provided, use them as starting point. Otherwise prompt for:
   - **Title** (required): Short, clear task name
   - **Description** (required): What needs to be done
   - **Priority** (optional): low, medium, high (default: medium)
   - **Dependencies** (optional): List of task IDs this depends on
   - **Details** (optional): Additional implementation notes
   - **Test Strategy** (optional): How to verify completion

3. **Read current tasks**
   - Use Read tool to load `.taskmaster/tasks/tasks.json`
   - Parse JSON to get existing tasks

4. **Generate new task ID**
   - Find highest existing task ID
   - Increment by 1 for new task ID
   - If adding as subtask, use parent.id notation (e.g., "1.3")

5. **Create task object**
   ```json
   {
     "id": <new-id>,
     "title": "<title>",
     "description": "<description>",
     "status": "pending",
     "priority": "<priority>",
     "dependencies": [],
     "details": "<details>",
     "testStrategy": "<test-strategy>",
     "subtasks": []
   }
   ```

6. **Add to tasks array**
   - Insert new task into appropriate position in tasks array
   - Maintain task ordering by ID

7. **Write updated tasks**
   - Use Write tool to save modified tasks.json
   - Preserve all formatting

8. **Confirm creation**
   - Display new task details:
   ```
   ✅ Task #7 created successfully!

   Title: Implement caching layer
   Status: pending
   Priority: medium

   Next steps:
   - Run /tm:show 7 to see full details
   - Run /tm:expand 7 to break into subtasks
   - Run /tm:list to see all tasks
   ```

## Examples

```bash
# Interactive mode
/tm:add

# Quick add with description
/tm:add Implement user dashboard with analytics

# Will prompt for additional details
```
