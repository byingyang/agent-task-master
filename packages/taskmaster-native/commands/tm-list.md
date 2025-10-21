---
description: List all tasks with their current status
argument-hint: [status-filter]
---

List all tasks from the Task Master project.

Arguments: $ARGUMENTS (optional status filter: pending, in-progress, done, blocked, deferred, cancelled)

## List Tasks Process

1. **Check initialization**
   - Use Bash tool to verify `.taskmaster/tasks/tasks.json` exists: `test -f .taskmaster/tasks/tasks.json && echo "exists" || echo "not found"`
   - If not, suggest running `/tm:init` first

2. **Read tasks efficiently**
   - **IMPORTANT**: For large tasks.json files (>25KB), do NOT use Read tool
   - Use Bash tool with jq to extract only needed data
   - See "Efficient File Operations" section below for specific commands

3. **Apply filters**
   - If arguments provided, filter by status
   - Support natural language filters: "pending", "in progress", "done", etc.
   - Support multiple filters: "pending high priority"

4. **Format output**
   - Display tasks in a clear, organized format:
   ```
   📋 Task Master - Project Tasks

   ✅ DONE (2 tasks)
   [1] Implement user authentication
   [2] Set up database schema

   🚧 IN PROGRESS (1 task)
   [3] Build API endpoints

   ⏳ PENDING (3 tasks)
   [4] Write integration tests [depends on: 3]
   [5] Deploy to staging
   [6] Update documentation

   📊 Summary: 6 total tasks (2 done, 1 in progress, 3 pending)
   ```

5. **Show task hierarchy**
   - Display parent-child relationships
   - Indent subtasks appropriately
   - Show dependencies

6. **Provide helpful info**
   - Suggest `/tm:show <id>` to see task details
   - Suggest `/tm:next` to get next recommended task
   - Suggest `/tm:status <id> <status>` to update task status

## Efficient File Operations for Large tasks.json Files

When tasks.json exceeds 25,000 characters, use these jq commands via Bash tool instead of Read tool:

### Check if file exists
```bash
test -f .taskmaster/tasks/tasks.json && echo "exists" || echo "not found"
```

### List all tasks with basic info
```bash
jq -r '.master.tasks[] | "\(.id): \(.title) [\(.status)]"' .taskmaster/tasks/tasks.json
```

### Filter by status
```bash
# Pending tasks
jq -r '.master.tasks[] | select(.status == "pending") | "\(.id): \(.title) [Priority: \(.priority // "none")]"' .taskmaster/tasks/tasks.json

# In-progress tasks
jq -r '.master.tasks[] | select(.status == "in-progress") | "\(.id): \(.title) [Priority: \(.priority // "none")]"' .taskmaster/tasks/tasks.json

# Done tasks
jq -r '.master.tasks[] | select(.status == "done") | "\(.id): \(.title)"' .taskmaster/tasks/tasks.json

# Blocked tasks
jq -r '.master.tasks[] | select(.status == "blocked") | "\(.id): \(.title) [Blocker: \(.blocker // "not specified")]"' .taskmaster/tasks/tasks.json
```

### Get status counts for summary
```bash
jq '{
  total: (.master.tasks | length),
  done: [.master.tasks[] | select(.status == "done")] | length,
  in_progress: [.master.tasks[] | select(.status == "in-progress")] | length,
  pending: [.master.tasks[] | select(.status == "pending")] | length,
  blocked: [.master.tasks[] | select(.status == "blocked")] | length
}' .taskmaster/tasks/tasks.json
```

### Filter by priority
```bash
# High priority tasks
jq -r '.master.tasks[] | select(.priority == "high") | "\(.id): \(.title) [\(.status)]"' .taskmaster/tasks/tasks.json

# Combined filter: pending AND high priority
jq -r '.master.tasks[] | select(.status == "pending" and .priority == "high") | "\(.id): \(.title)"' .taskmaster/tasks/tasks.json
```

### Show tasks with dependencies
```bash
jq -r '.master.tasks[] | select(.dependencies | length > 0) | "\(.id): \(.title) [depends on: \(.dependencies | join(", "))]"' .taskmaster/tasks/tasks.json
```

**Reference**: See `packages/taskmaster-native/docs/jq-commands-reference.md` for complete jq command library.
