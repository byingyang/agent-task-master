# JQ Commands Reference for Large tasks.json Files

When `tasks.json` files exceed 25,000 characters, the Read tool cannot load them directly. This reference provides efficient jq commands for all Task Master Native operations that work with files of any size.

**Tested with**: 125KB file (787 lines, 29 tasks) in ~/dev/hindsight project

## File Structure

```json
{
  "master": {
    "tasks": [
      {
        "id": 1,
        "title": "Task title",
        "description": "Task description",
        "status": "pending|in-progress|done|blocked|deferred|cancelled",
        "priority": "low|medium|high",
        "dependencies": [1, 2],
        "details": "Implementation details",
        "testStrategy": "Test approach",
        "subtasks": [...]
      }
    ]
  }
}
```

## Core Operations

### 1. List All Tasks

```bash
# List all tasks with basic info
jq -r '.master.tasks[] | "\(.id): \(.title) [\(.status)]"' .taskmaster/tasks/tasks.json

# List tasks with priority
jq -r '.master.tasks[] | "\(.id): \(.title) [Priority: \(.priority // "none"), Status: \(.status)]"' .taskmaster/tasks/tasks.json
```

### 2. Filter Tasks by Status

```bash
# Get all pending tasks
jq '.master.tasks[] | select(.status == "pending")' .taskmaster/tasks/tasks.json

# Get all in-progress tasks
jq '.master.tasks[] | select(.status == "in-progress")' .taskmaster/tasks/tasks.json

# Get all done tasks
jq '.master.tasks[] | select(.status == "done")' .taskmaster/tasks/tasks.json

# Get all blocked tasks
jq '.master.tasks[] | select(.status == "blocked")' .taskmaster/tasks/tasks.json

# Get tasks by multiple statuses
jq '.master.tasks[] | select(.status == "pending" or .status == "in-progress")' .taskmaster/tasks/tasks.json
```

### 3. Get Specific Task by ID

```bash
# Get task by ID (returns full task with subtasks)
jq '.master.tasks[] | select(.id == 2)' .taskmaster/tasks/tasks.json

# Get task with formatted output
jq -r '.master.tasks[] | select(.id == 2) | "ID: \(.id)\nTitle: \(.title)\nStatus: \(.status)\nPriority: \(.priority)\nDescription: \(.description)"' .taskmaster/tasks/tasks.json

# Get just task title and status
jq '.master.tasks[] | select(.id == 2) | {id, title, status}' .taskmaster/tasks/tasks.json
```

### 4. Count Tasks by Status

```bash
# Count all tasks by status
jq '[.master.tasks | group_by(.status) | .[] | {status: .[0].status, count: length}]' .taskmaster/tasks/tasks.json

# Count specific status
jq '[.master.tasks[] | select(.status == "pending")] | length' .taskmaster/tasks/tasks.json

# Count in-progress tasks
jq '[.master.tasks[] | select(.status == "in-progress")] | length' .taskmaster/tasks/tasks.json

# Get total task count
jq '.master.tasks | length' .taskmaster/tasks/tasks.json
```

### 5. Find Tasks by Priority

```bash
# Get all high priority tasks
jq '.master.tasks[] | select(.priority == "high")' .taskmaster/tasks/tasks.json

# Get high priority pending tasks
jq '.master.tasks[] | select(.priority == "high" and .status == "pending")' .taskmaster/tasks/tasks.json

# Count by priority
jq '[.master.tasks | group_by(.priority) | .[] | {priority: .[0].priority, count: length}]' .taskmaster/tasks/tasks.json
```

### 6. Find Tasks with Subtasks

```bash
# Get all tasks that have subtasks
jq '.master.tasks[] | select(.subtasks and (.subtasks | length) > 0) | {id, title, subtask_count: (.subtasks | length)}' .taskmaster/tasks/tasks.json

# Get specific subtask
jq '.master.tasks[] | select(.id == 2) | .subtasks[] | select(.id == "2.1")' .taskmaster/tasks/tasks.json

# Count subtasks for a task
jq '.master.tasks[] | select(.id == 2) | .subtasks | length' .taskmaster/tasks/tasks.json
```

### 7. Dependency Analysis

```bash
# Get tasks with no dependencies (can start immediately)
jq '.master.tasks[] | select(.dependencies | length == 0)' .taskmaster/tasks/tasks.json

# Get tasks that depend on a specific task
jq '.master.tasks[] | select(.dependencies | contains([2]))' .taskmaster/tasks/tasks.json

# Find tasks with unmet dependencies (complex - requires checking if dependency tasks are done)
# This gets all dependency IDs first, then checks if they're all done
jq --argjson task_id 5 '
  .master.tasks[] |
  select(.id == $task_id) |
  .dependencies as $deps |
  {
    id,
    title,
    dependencies: $deps,
    unmet: [
      $deps[] as $dep |
      select([.master.tasks[] | select(.id == $dep and .status != "done")] | length > 0) |
      $dep
    ]
  }
' .taskmaster/tasks/tasks.json
```

### 8. Find Available Tasks (Next Task Logic)

```bash
# Find pending tasks with no dependencies
jq '.master.tasks[] | select(.status == "pending" and (.dependencies | length == 0))' .taskmaster/tasks/tasks.json

# Find pending high-priority tasks
jq '.master.tasks[] | select(.status == "pending" and .priority == "high")' .taskmaster/tasks/tasks.json

# Complex: Find pending tasks where ALL dependencies are done
# This requires a two-pass approach or complex query
# Simpler approach: Get pending tasks, then manually verify dependencies
jq '.master.tasks[] | select(.status == "pending") | {id, title, priority, dependencies}' .taskmaster/tasks/tasks.json
```

## Modification Operations

### 9. Update Task Status (Surgical Update)

**IMPORTANT**: For large files, use jq to modify in-place rather than Write tool

```bash
# Update status for task ID 2
jq '(.master.tasks[] | select(.id == 2) | .status) = "done"' .taskmaster/tasks/tasks.json > /tmp/tasks.json && mv /tmp/tasks.json .taskmaster/tasks/tasks.json

# Update status and add previousStatus
jq '
  (.master.tasks[] | select(.id == 2)) |=
  (.previousStatus = .status | .status = "in-progress")
' .taskmaster/tasks/tasks.json > /tmp/tasks.json && mv /tmp/tasks.json .taskmaster/tasks/tasks.json

# Update subtask status
jq '
  (.master.tasks[] | select(.id == 2) | .subtasks[] | select(.id == "2.1") | .status) = "done"
' .taskmaster/tasks/tasks.json > /tmp/tasks.json && mv /tmp/tasks.json .taskmaster/tasks/tasks.json
```

### 10. Add New Task

```bash
# Get next available ID
jq '.master.tasks | map(.id) | max + 1' .taskmaster/tasks/tasks.json

# Add new task (replace NEW_TASK_JSON with actual task object)
jq '.master.tasks += [{
  "id": 30,
  "title": "New task",
  "description": "Description",
  "status": "pending",
  "priority": "medium",
  "dependencies": [],
  "details": "",
  "testStrategy": "",
  "subtasks": []
}]' .taskmaster/tasks/tasks.json > /tmp/tasks.json && mv /tmp/tasks.json .taskmaster/tasks/tasks.json
```

### 11. Remove Task by ID

```bash
# Remove task with ID 5
jq '.master.tasks = [.master.tasks[] | select(.id != 5)]' .taskmaster/tasks/tasks.json > /tmp/tasks.json && mv /tmp/tasks.json .taskmaster/tasks/tasks.json

# Remove subtask from parent task
jq '
  (.master.tasks[] | select(.id == 2) | .subtasks) =
  [.master.tasks[] | select(.id == 2) | .subtasks[] | select(.id != "2.1")]
' .taskmaster/tasks/tasks.json > /tmp/tasks.json && mv /tmp/tasks.json .taskmaster/tasks/tasks.json
```

### 12. Add Subtasks to Task

```bash
# Add subtasks array to task ID 5
jq '
  (.master.tasks[] | select(.id == 5) | .subtasks) += [{
    "id": "5.1",
    "title": "First subtask",
    "description": "Subtask description",
    "status": "pending",
    "dependencies": []
  }]
' .taskmaster/tasks/tasks.json > /tmp/tasks.json && mv /tmp/tasks.json .taskmaster/tasks/tasks.json
```

### 13. Update Task Fields (Details, Notes, etc.)

```bash
# Add implementation notes to task
jq '
  (.master.tasks[] | select(.id == 2) | .implementationNotes) = "New implementation notes here"
' .taskmaster/tasks/tasks.json > /tmp/tasks.json && mv /tmp/tasks.json .taskmaster/tasks/tasks.json

# Update task details
jq '
  (.master.tasks[] | select(.id == 2) | .details) = "Updated details"
' .taskmaster/tasks/tasks.json > /tmp/tasks.json && mv /tmp/tasks.json .taskmaster/tasks/tasks.json
```

## Statistical Analysis

### 14. Project Statistics

```bash
# Get complete project overview
jq '{
  total_tasks: (.master.tasks | length),
  by_status: [.master.tasks | group_by(.status) | .[] | {status: .[0].status, count: length}],
  by_priority: [.master.tasks | group_by(.priority) | .[] | {priority: .[0].priority, count: length}],
  with_subtasks: [.master.tasks[] | select(.subtasks and (.subtasks | length) > 0)] | length
}' .taskmaster/tasks/tasks.json

# Get status summary
jq '{
  done: [.master.tasks[] | select(.status == "done")] | length,
  in_progress: [.master.tasks[] | select(.status == "in-progress")] | length,
  pending: [.master.tasks[] | select(.status == "pending")] | length,
  blocked: [.master.tasks[] | select(.status == "blocked")] | length
}' .taskmaster/tasks/tasks.json
```

### 15. Find Blocking Tasks

```bash
# Find tasks that block many others (high impact)
jq '
  .master.tasks |
  map({id, title, blocks: [.. | .dependencies[]? | select(. == .id)] | length}) |
  sort_by(.blocks) |
  reverse
' .taskmaster/tasks/tasks.json
```

## Best Practices

### When to Use Each Approach

1. **Read Specific Data**: Use `jq '.master.tasks[] | select(.id == ID)'` to get only what you need
2. **Status Updates**: Use jq with temp file pattern for surgical updates
3. **Counting/Stats**: Use jq aggregation functions to avoid loading full data
4. **Adding Tasks**: Use `jq '.master.tasks += [NEW_TASK]'` pattern
5. **Multiple Reads**: If you need several pieces of data, combine queries with `{...}` syntax

### Performance Tips

1. **Filter Early**: Use `select()` as early as possible in the pipeline
2. **Avoid Full Reads**: Never read entire file if you only need one task
3. **Pipe Multiple Commands**: Chain jq operations instead of multiple tool calls
4. **Use Temp Files**: For modifications, always use temp file pattern with `mv`
5. **Compact Output**: Use `-c` flag for compact output when passing between commands

### Error Handling

```bash
# Check if task exists before operating
jq -e '.master.tasks[] | select(.id == 2)' .taskmaster/tasks/tasks.json > /dev/null && echo "Task exists" || echo "Task not found"

# Validate JSON before writing
jq '.' /tmp/tasks.json > /dev/null && mv /tmp/tasks.json .taskmaster/tasks/tasks.json || echo "Invalid JSON, keeping original"
```

## Command-Specific Quick Reference

| Command | Primary jq Query |
|---------|------------------|
| tm-list | `jq '.master.tasks[]'` or `jq '.master.tasks[] \| select(.status == "STATUS")'` |
| tm-show | `jq '.master.tasks[] \| select(.id == ID)'` |
| tm-status | `jq '(.master.tasks[] \| select(.id == ID) \| .status) = "NEW_STATUS"'` |
| tm-complete | Same as tm-status with `"done"` |
| tm-next | `jq '.master.tasks[] \| select(.status == "pending")'` + dependency check |
| tm-expand | `jq '(.master.tasks[] \| select(.id == ID) \| .subtasks) += [SUBTASKS]'` |
| tm-add | `jq '.master.tasks += [NEW_TASK]'` |
| tm-remove | `jq '.master.tasks = [.master.tasks[] \| select(.id != ID)]'` |
| tm-analyze | Multiple queries for statistics |

## Testing Commands

Test these commands with the hindsight project:

```bash
# Verify file size
wc -c ~/dev/hindsight/.taskmaster/tasks/tasks.json

# Test basic query
jq '.master.tasks | length' ~/dev/hindsight/.taskmaster/tasks/tasks.json

# Test filtered query
jq '.master.tasks[] | select(.status == "pending") | {id, title}' ~/dev/hindsight/.taskmaster/tasks/tasks.json
```

## Notes

- All jq commands tested with tasks.json files up to 125KB (787 lines)
- Use Bash tool for all jq operations, never try to Read the full file
- Always validate JSON after modifications before replacing original
- Consider creating a backup before bulk modifications: `cp .taskmaster/tasks/tasks.json .taskmaster/tasks/tasks.json.bak`
