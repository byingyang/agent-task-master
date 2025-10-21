---
description: Add a new task to the project
argument-hint: [task-description]
---

Add a new task to the Task Master project.

Arguments: $ARGUMENTS (optional: brief task description to get started)

## Add Task Process

1. **Check initialization**
   - Use Bash tool to verify `.taskmaster/tasks/tasks.json` exists: `test -f .taskmaster/tasks/tasks.json && echo "exists" || echo "not found"`
   - If not, suggest running `/tm:init` first

2. **Gather task information**
   If arguments provided, use them as starting point. Otherwise prompt for:
   - **Title** (required): Short, clear task name
   - **Description** (required): What needs to be done
   - **Priority** (optional): low, medium, high (default: medium)
   - **Dependencies** (optional): List of task IDs this depends on
   - **Details** (optional): Additional implementation notes
   - **Test Strategy** (optional): How to verify completion

3. **Find next task ID efficiently**
   - **IMPORTANT**: For large tasks.json files (>25KB), do NOT use Read tool
   - Use Bash tool with jq to find highest task ID
   - See "Efficient File Operations" section below for specific commands

4. **Generate new task ID**
   - Increment highest ID by 1 for new task ID
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
   - **CRITICAL**: For large files, use jq with temp file pattern (see below)
   - Insert new task into tasks array
   - Maintain task ordering by ID (jq handles this automatically)

7. **Confirm creation**
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

## Efficient File Operations for Large tasks.json Files

When tasks.json exceeds 25,000 characters, use these jq commands via Bash tool:

### Get next available task ID
```bash
# Get highest task ID and add 1
jq '.master.tasks | map(.id) | max + 1' .taskmaster/tasks/tasks.json
```

### Add new task to array (surgical update)
```bash
# Get next ID first
NEXT_ID=$(jq '.master.tasks | map(.id) | max + 1' .taskmaster/tasks/tasks.json)

# Add new task
jq --argjson new_task "{
  \"id\": $NEXT_ID,
  \"title\": \"Implement caching layer\",
  \"description\": \"Add Redis-based caching\",
  \"status\": \"pending\",
  \"priority\": \"medium\",
  \"dependencies\": [],
  \"details\": \"\",
  \"testStrategy\": \"\",
  \"subtasks\": []
}" '.master.tasks += [$new_task]' \
  .taskmaster/tasks/tasks.json > /tmp/tasks_temp.json && \
  mv /tmp/tasks_temp.json .taskmaster/tasks/tasks.json
```

### Add subtask to parent task
```bash
# Get parent task's next subtask ID
PARENT_ID=2
NEXT_SUBTASK_ID=$(jq --argjson parent_id $PARENT_ID '.master.tasks[] | select(.id == $parent_id) | .subtasks | map(.id | split(".")[1] | tonumber) | max + 1' .taskmaster/tasks/tasks.json)

# Add subtask to parent
jq --argjson parent_id $PARENT_ID --arg subtask_id "${PARENT_ID}.${NEXT_SUBTASK_ID}" --argjson new_subtask '{
  "title": "New subtask",
  "description": "Subtask description",
  "status": "pending",
  "dependencies": []
}' '(.master.tasks[] | select(.id == $parent_id) | .subtasks) += [($new_subtask + {id: $subtask_id})]' \
  .taskmaster/tasks/tasks.json > /tmp/tasks_temp.json && \
  mv /tmp/tasks_temp.json .taskmaster/tasks/tasks.json
```

### Validate new task was added
```bash
# Verify task exists
TASK_ID=7
jq -e ".master.tasks[] | select(.id == $TASK_ID)" .taskmaster/tasks/tasks.json > /dev/null && \
  echo "✅ Task $TASK_ID created successfully" || \
  echo "❌ Task creation failed"
```

**Reference**: See `packages/taskmaster-native/docs/jq-commands-reference.md` for complete jq command library.

## Examples

```bash
# Interactive mode
/tm:add

# Quick add with description
/tm:add Implement user dashboard with analytics

# Will prompt for additional details
```
