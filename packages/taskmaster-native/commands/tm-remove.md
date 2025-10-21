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
   - Use Bash tool to verify `.taskmaster/tasks/tasks.json` exists: `test -f .taskmaster/tasks/tasks.json && echo "exists" || echo "not found"`
   - If not, suggest running `/tm:init` first

3. **Find task efficiently**
   - **IMPORTANT**: For large tasks.json files (>25KB), do NOT use Read tool
   - Use Bash tool with jq to find task
   - See "Efficient File Operations" section below for specific commands

4. **Validate task removal**
   - Check if task exists
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
   - **CRITICAL**: For large files, use jq with temp file pattern (see below)
   - Delete task from tasks array
   - If it's a subtask, remove from parent's subtasks array
   - Update dependencies in other tasks (remove references to deleted task)

7. **Confirm deletion**
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

## Efficient File Operations for Large tasks.json Files

When tasks.json exceeds 25,000 characters, use these jq commands via Bash tool:

### Check if task exists and get details
```bash
TASK_ID=3

# Get task info before removing
jq ".master.tasks[] | select(.id == $TASK_ID) | {id, title, has_subtasks: (.subtasks | length > 0), subtask_count: (.subtasks | length)}" .taskmaster/tasks/tasks.json
```

### Check for tasks that depend on this one
```bash
TASK_ID=3

# Find dependent tasks
jq --argjson task_id $TASK_ID '[.master.tasks[] | select(.dependencies | contains([$task_id]))] | map({id, title})' .taskmaster/tasks/tasks.json
```

### Remove task from array (surgical update)
```bash
TASK_ID=3

# Remove task
jq ".master.tasks = [.master.tasks[] | select(.id != $TASK_ID)]" \
  .taskmaster/tasks/tasks.json > /tmp/tasks_temp.json && \
  mv /tmp/tasks_temp.json .taskmaster/tasks/tasks.json
```

### Remove subtask from parent
```bash
PARENT_ID=2
SUBTASK_ID="2.3"

# Remove subtask
jq --argjson parent_id $PARENT_ID --arg subtask_id "$SUBTASK_ID" \
  '(.master.tasks[] | select(.id == $parent_id) | .subtasks) = [.master.tasks[] | select(.id == $parent_id) | .subtasks[] | select(.id != $subtask_id)]' \
  .taskmaster/tasks/tasks.json > /tmp/tasks_temp.json && \
  mv /tmp/tasks_temp.json .taskmaster/tasks/tasks.json
```

### Remove task and clean up dependencies
```bash
TASK_ID=3

# Step 1: Remove task
jq ".master.tasks = [.master.tasks[] | select(.id != $TASK_ID)]" \
  .taskmaster/tasks/tasks.json > /tmp/tasks_temp.json

# Step 2: Clean up dependencies in remaining tasks
jq --argjson task_id $TASK_ID \
  '.master.tasks[] |= (if .dependencies then .dependencies = [.dependencies[] | select(. != $task_id)] else . end)' \
  /tmp/tasks_temp.json > /tmp/tasks_temp2.json && \
  mv /tmp/tasks_temp2.json .taskmaster/tasks/tasks.json

# Clean up temp file
rm -f /tmp/tasks_temp.json
```

### Verify task was removed
```bash
TASK_ID=3

# Check task no longer exists
jq -e ".master.tasks[] | select(.id == $TASK_ID)" .taskmaster/tasks/tasks.json > /dev/null && \
  echo "❌ Task still exists" || \
  echo "✅ Task removed successfully"
```

**Reference**: See `packages/taskmaster-native/docs/jq-commands-reference.md` for complete jq command library.

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
