---
description: List all tasks with their current status
argument-hint: [status-filter]
---

List all tasks from the Task Master project.

Arguments: $ARGUMENTS (optional status filter: pending, in-progress, done, blocked, deferred, cancelled)

## List Tasks Process

1. **Check initialization**
   - Use Read tool to verify `.taskmaster/tasks/tasks.json` exists
   - If not, suggest running `/tm:init` first

2. **Read tasks**
   - Use Read tool to load `.taskmaster/tasks/tasks.json`
   - Parse JSON to get all tasks

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
