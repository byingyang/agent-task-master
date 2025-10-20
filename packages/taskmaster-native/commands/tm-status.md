---
description: Update the status of a task
argument-hint: <task-id> <new-status>
---

Change the status of a specific task.

Arguments: $ARGUMENTS (required: task ID and new status)

Supported statuses:
- `pending` - Task is ready to work on
- `in-progress` - Currently being worked on
- `done` - Completed and verified
- `blocked` - Waiting on external factors
- `deferred` - Postponed for later
- `cancelled` - No longer needed

## Update Status Process

1. **Parse arguments**
   - Extract task ID (e.g., "1", "1.2", "2.3.1")
   - Extract new status (or accept natural language: "mark as done", "set to in progress")
   - Validate status is one of the supported values

2. **Check initialization**
   - Use Read tool to verify `.taskmaster/tasks/tasks.json` exists
   - If not, suggest running `/tm:init` first

3. **Read current tasks**
   - Use Read tool to load `.taskmaster/tasks/tasks.json`
   - Parse JSON structure

4. **Find and update task**
   - Locate task with matching ID (handle nested subtasks)
   - If task not found, show error and list available tasks
   - Store previous status in `previousStatus` field
   - Update task status to new value

5. **Write updated tasks**
   - Use Write tool to save modified tasks.json
   - Preserve all other task data and structure

6. **Confirm change**
   - Display success message:
   ```
   ✅ Task #1.2 status updated: in-progress → done

   Next steps:
   - Run /tm:list to see updated task list
   - Run /tm:next to get next task recommendation
   ```

7. **Smart suggestions**
   - If marking task as "done":
     * Check if any blocked tasks are now unblocked
     * Suggest working on dependent tasks next
   - If marking as "in-progress":
     * Check if dependencies are met
     * Warn if dependencies are not done
   - If marking as "blocked":
     * Suggest documenting the blocker in task details

## Examples

```bash
# Simple usage
/tm:status 1 done
/tm:status 2.1 in-progress

# Natural language
/tm:status mark task 3 as completed
/tm:status set 1.2 to blocked
```
