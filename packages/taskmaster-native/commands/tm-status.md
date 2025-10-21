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
   - Use Bash tool to verify `.taskmaster/tasks/tasks.json` exists: `test -f .taskmaster/tasks/tasks.json && echo "exists" || echo "not found"`
   - If not, suggest running `/tm:init` first

3. **Find task efficiently**
   - **IMPORTANT**: For large tasks.json files (>25KB), do NOT use Read tool
   - Use Bash tool with jq to check if task exists first
   - See "Efficient File Operations" section below for specific commands

4. **Update task status surgically**
   - **CRITICAL**: Use jq with temp file pattern for surgical updates
   - This avoids loading and rewriting the entire file
   - Preserves file structure and all other data
   - Much faster and more efficient than Edit tool for large files

5. **Update logic**
   - Locate task with matching ID (handle nested subtasks)
   - If task not found, show error and list available tasks
   - Store previous status before updating
   - Update to new status
   - Save modified file atomically

   **IMPORTANT**: For large files, use jq modification pattern (see below) instead of Edit/Write tools

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

## Efficient File Operations for Large tasks.json Files

When tasks.json exceeds 25,000 characters, use these jq commands via Bash tool:

### Check if task exists
```bash
jq -e '.master.tasks[] | select(.id == 2)' .taskmaster/tasks/tasks.json > /dev/null && echo "exists" || echo "not found"
```

### Update task status (SURGICAL UPDATE)
**CRITICAL**: Use this pattern instead of Edit/Write tools for large files

```bash
# Update main task status
jq '(.master.tasks[] | select(.id == 2)) |= (.previousStatus = .status | .status = "done")' \
  .taskmaster/tasks/tasks.json > /tmp/tasks_temp.json && \
  mv /tmp/tasks_temp.json .taskmaster/tasks/tasks.json

# Update subtask status
jq '(.master.tasks[] | select(.id == 2) | .subtasks[] | select(.id == "2.1")) |= (.previousStatus = .status | .status = "done")' \
  .taskmaster/tasks/tasks.json > /tmp/tasks_temp.json && \
  mv /tmp/tasks_temp.json .taskmaster/tasks/tasks.json
```

### Validate JSON before replacing
```bash
# Always validate the temp file before moving it
jq '.' /tmp/tasks_temp.json > /dev/null && \
  mv /tmp/tasks_temp.json .taskmaster/tasks/tasks.json || \
  echo "ERROR: Invalid JSON, keeping original file"
```

### Check dependencies before marking in-progress
```bash
# Get task and check if all dependencies are done
jq --argjson task_id 5 '
  .master.tasks[] |
  select(.id == $task_id) |
  {
    id,
    title,
    dependencies,
    unmet_dependencies: [
      .dependencies[] as $dep |
      select([.master.tasks[] | select(.id == $dep and .status != "done")] | length > 0) |
      $dep
    ]
  }
' .taskmaster/tasks/tasks.json
```

### Find tasks that depend on this one (for "done" status)
```bash
# Find tasks that have this task as a dependency
jq --argjson completed_id 2 '
  [.master.tasks[] | select(.dependencies | contains([$completed_id]))] |
  map({id, title, status})
' .taskmaster/tasks/tasks.json
```

### Complete workflow example
```bash
# 1. Check task exists
TASK_ID=2
jq -e ".master.tasks[] | select(.id == $TASK_ID)" .taskmaster/tasks/tasks.json > /dev/null || {
  echo "Task $TASK_ID not found"
  exit 1
}

# 2. Update status with previousStatus tracking
jq "(.master.tasks[] | select(.id == $TASK_ID)) |= (.previousStatus = .status | .status = \"done\")" \
  .taskmaster/tasks/tasks.json > /tmp/tasks_temp.json

# 3. Validate and replace
jq '.' /tmp/tasks_temp.json > /dev/null && \
  mv /tmp/tasks_temp.json .taskmaster/tasks/tasks.json && \
  echo "✅ Task $TASK_ID marked as done" || \
  echo "❌ Update failed, keeping original"
```

**Reference**: See `packages/taskmaster-native/docs/jq-commands-reference.md` for complete jq command library.

## Examples

```bash
# Simple usage
/tm:status 1 done
/tm:status 2.1 in-progress

# Natural language
/tm:status mark task 3 as completed
/tm:status set 1.2 to blocked
```
