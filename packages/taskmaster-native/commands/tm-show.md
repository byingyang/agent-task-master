---
description: Show detailed information about a specific task
argument-hint: <task-id>
---

Display detailed information for a specific task.

Arguments: $ARGUMENTS (required: task ID, e.g., "1" or "1.2")

## Show Task Details Process

1. **Validate arguments**
   - Ensure task ID is provided
   - If not, show error and suggest `/tm:list` to see available tasks

2. **Check initialization**
   - Use Bash tool to verify `.taskmaster/tasks/tasks.json` exists: `test -f .taskmaster/tasks/tasks.json && echo "exists" || echo "not found"`
   - If not, suggest running `/tm:init` first

3. **Read and find task efficiently**
   - **IMPORTANT**: For large tasks.json files (>25KB), do NOT use Read tool
   - Use Bash tool with jq to extract only the specific task
   - See "Efficient File Operations" section below for specific commands
   - Handle nested subtasks (e.g., ID "1.2.1")

4. **Display task details**
   Format output with all task information:
   ```
   📋 Task #1.2: Implement User Authentication

   Status: 🚧 in-progress
   Priority: 🔴 high

   Description:
   Set up JWT-based authentication system with secure token handling

   Details:
   - Use bcrypt for password hashing
   - Implement JWT token generation and validation
   - Add refresh token mechanism
   - Include rate limiting for auth endpoints

   Dependencies:
   - Task #1.1: Database setup (✅ done)

   Test Strategy:
   - Unit tests for auth functions
   - Integration tests for login/logout flow
   - Security testing for token validation

   Subtasks (2/3 completed):
   ✅ [1.2.1] Set up JWT library
   ✅ [1.2.2] Implement password hashing
   ⏳ [1.2.3] Add refresh token logic
   ```

5. **Show related actions**
   - Suggest `/tm:status <id> <status>` to update status
   - Suggest `/tm:expand <id>` if task needs breakdown
   - Suggest `/tm:next` to see what to work on next
   - If task has subtasks, suggest viewing them individually

6. **Handle errors gracefully**
   - If task ID not found, list available task IDs
   - Provide helpful suggestions

## Efficient File Operations for Large tasks.json Files

When tasks.json exceeds 25,000 characters, use these jq commands via Bash tool instead of Read tool:

### Check if file exists
```bash
test -f .taskmaster/tasks/tasks.json && echo "exists" || echo "not found"
```

### Get specific task by ID (main tasks)
```bash
# Get task with ID 2 (returns complete task object with all fields and subtasks)
jq '.master.tasks[] | select(.id == 2)' .taskmaster/tasks/tasks.json

# Pretty formatted output for display
jq '.master.tasks[] | select(.id == 2) | {
  id,
  title,
  status,
  priority,
  description,
  details,
  testStrategy,
  dependencies,
  subtasks: (.subtasks // [])
}' .taskmaster/tasks/tasks.json
```

### Get specific subtask by ID
```bash
# Get subtask "2.1" from task 2
jq '.master.tasks[] | select(.id == 2) | .subtasks[] | select(.id == "2.1")' .taskmaster/tasks/tasks.json
```

### Check if task exists before showing
```bash
# Returns empty if task doesn't exist
jq -e '.master.tasks[] | select(.id == 2)' .taskmaster/tasks/tasks.json > /dev/null && echo "Task exists" || echo "Task not found"
```

### Get task with formatted text output
```bash
jq -r '.master.tasks[] | select(.id == 2) |
"ID: \(.id)
Title: \(.title)
Status: \(.status)
Priority: \(.priority // "none")
Description: \(.description)

Details:
\(.details // "No details provided")

Test Strategy:
\(.testStrategy // "No test strategy defined")

Dependencies: \(.dependencies | join(", "))
Subtasks: \((.subtasks // []) | length) subtask(s)"' .taskmaster/tasks/tasks.json
```

### List all available task IDs (for error messages)
```bash
jq -r '.master.tasks[] | .id' .taskmaster/tasks/tasks.json
```

### Get task with dependency status
```bash
# Show task and check which dependencies are met
jq --argjson task_id 5 '
  .master.tasks[] |
  select(.id == $task_id) |
  . + {
    dependency_status: [
      .dependencies[] as $dep |
      {
        id: $dep,
        done: (any(.master.tasks[]; .id == $dep and .status == "done"))
      }
    ]
  }
' .taskmaster/tasks/tasks.json
```

**Reference**: See `packages/taskmaster-native/docs/jq-commands-reference.md` for complete jq command library.
