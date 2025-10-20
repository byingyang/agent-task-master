---
description: Remove a task from the project
argument-hint: <task-id>
---

Remove a task from the Task Master project.

Arguments: $ARGUMENTS (required: task ID to remove)

## Remove Task Process

1. **Parse arguments**
   - Extract task ID to remove
   - If not provided, show error and list available tasks

2. **Check initialization**
   - Use Read tool to verify `.taskmaster/tasks/tasks.json` exists
   - If not, suggest running `/tm:init` first

3. **Read current tasks**
   - Use Read tool to load `.taskmaster/tasks/tasks.json`
   - Parse JSON structure

4. **Find task**
   - Locate task with matching ID
   - If not found, show error with available task IDs
   - If task has subtasks, ask for confirmation (will remove all subtasks)

5. **Check for dependencies**
   - Search all tasks for dependencies on this task
   - If other tasks depend on it, show warning:
   ```
   ⚠️  Warning: The following tasks depend on task #3:
   - Task #4: Integration tests
   - Task #5: Deploy to staging

   Removing this task will break these dependencies.
   Type 'confirm' to proceed anyway, or 'cancel' to abort.
   ```

6. **Remove task**
   - Delete task from tasks array
   - If it's a subtask, remove from parent's subtasks array
   - Update dependencies in other tasks (remove references to deleted task)

7. **Write updated tasks**
   - Use Write tool to save modified tasks.json
   - Preserve all other task data

8. **Confirm deletion**
   - Display success message:
   ```
   ✅ Task #3 removed successfully

   Removed:
   - Task #3: Build API endpoints
   - 2 subtasks

   Updated dependencies:
   - Task #4: Removed dependency on #3

   Run /tm:list to see updated task list
   ```

## Safety Features

- Confirmation required for tasks with subtasks
- Warning for tasks with dependents
- Option to cancel if dependencies exist
- Backup suggestion before major deletions

## Examples

```bash
# Remove a task
/tm:remove 3

# Remove a subtask
/tm:remove 1.2.3
```
