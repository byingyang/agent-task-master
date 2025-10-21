---
description: Mark task complete and get next recommendation
argument-hint: <task-id>
---

Quick command to mark a task as done and immediately get the next recommended task.

This is a convenience command that combines `/tm:status <id> done` and `/tm:next`.

Arguments: $ARGUMENTS (required: task ID to mark as complete)

## Complete Task Flow

1. **Parse arguments**
   - Extract task ID
   - If not provided, check if there's exactly one in-progress task
   - If one in-progress task exists, use that
   - If multiple or none, ask user to specify

2. **Check initialization**
   - Use Bash tool to verify `.taskmaster/tasks/tasks.json` exists: `test -f .taskmaster/tasks/tasks.json && echo "exists" || echo "not found"`
   - If not, suggest running `/tm:init` first

3. **Read and validate task efficiently**
   - **IMPORTANT**: For large tasks.json files (>25KB), do NOT use Read tool
   - Use Bash tool with jq to find and validate task
   - Verify task exists
   - Check current status
   - See "Efficient File Operations" section below for specific commands

4. **Completion checklist** (interactive)
   Ask user to confirm:
   ```
   ✓ Task Completion Checklist

   Task #1.2: Implement Password Hashing

   Before marking as complete, verify:
   □ Implementation is complete and working
   □ Tests are written and passing
   □ Code is reviewed (if applicable)
   □ Documentation is updated (if needed)
   □ Changes are committed

   Mark as complete? (y/n)
   ```

5. **Update task status**
   - Change status from current → "done"
   - **CRITICAL**: For large files, use jq with temp file pattern (see below)
   - Store previousStatus before updating
   - Update to "done" status
   - Save atomically

   **IMPORTANT**: For large files, use jq modification pattern instead of Edit/Write tools

6. **Check for newly unblocked tasks**
   - Scan all tasks for dependencies on completed task
   - Identify tasks that were blocked and are now unblocked
   - Announce newly available work

7. **Check parent task completion**
   - If this is a subtask, check if all sibling subtasks are done
   - If all subtasks complete, suggest marking parent as done
   ```
   🎉 All subtasks of Task #1 are now complete!

   Do you want to mark parent task as done too?
   Task #1: Implement User Authentication

   (y/n)
   ```

8. **Display completion celebration**
   ```
   ✅ Task Completed!

   Task #1.2: Implement Password Hashing
   Status: 🚧 In Progress → ✅ Done

   ═══════════════════════════════════════════════

   📊 IMPACT

   ✨ Tasks Unblocked: 3
   - Task #1.3: JWT token generation
   - Task #1.4: Login endpoints
   - Task #1.5: Refresh token mechanism

   📈 Progress Update:
   - Total: 15 tasks
   - Done: 5 (33% complete - up from 27%)
   - In Progress: 1 (down from 2)
   - Pending: 7 (down from 8)
   - Blocked: 2 (unchanged)

   🏆 Milestone: Authentication system 40% complete!

   ═══════════════════════════════════════════════
   ```

9. **Get next recommendation**
   - Use same logic as `/tm:next` command
   - Analyze newly unblocked tasks
   - Prioritize tasks that were just unblocked

10. **Display next task**
    ```
    🎯 Next Recommended Task: #1.3

    Task: JWT Token Generation
    Priority: 🔴 High
    Status: ⏳ Pending
    Complexity: Moderate

    Why this task?
    - Just unblocked by completing #1.2
    - Continues authentication flow momentum
    - High priority security feature
    - Clear dependencies are now met

    Ready to continue?
    - /tm:work         (start immediately)
    - /tm:show 1.3     (review details first)
    - /tm:list         (see all tasks)
    ```

## Smart Features

- **Auto-detect**: If only one in-progress task, uses that
- **Unblock detection**: Identifies newly available tasks
- **Parent completion**: Suggests completing parent when all subtasks done
- **Progress tracking**: Shows completion percentages
- **Milestone detection**: Celebrates key progress points
- **Momentum preservation**: Recommends related tasks to maintain flow

## Examples

```bash
# Complete specific task
/tm:complete 1.2

# Complete current task (if only one in progress)
/tm:complete

# Natural language
/tm:complete mark 1.2 as done
```

## Typical Workflow

```bash
# Start working
/tm:work

# ... do the work ...

# Complete and get next
/tm:complete 1.2

# Continue with recommended task
/tm:work
```

## Options

- `/tm:complete <id>` - Mark specific task done
- `/tm:complete` - Mark current task done (if only one in progress)
- `/tm:complete <id> skip-next` - Don't show next recommendation

## Efficient File Operations for Large tasks.json Files

When tasks.json exceeds 25,000 characters, use these jq commands via Bash tool:

### Check task status before completing
```bash
jq '.master.tasks[] | select(.id == 2) | {id, title, status}' .taskmaster/tasks/tasks.json
```

### Mark task as complete (SURGICAL UPDATE)
```bash
# Update task status to done with previousStatus tracking
jq '(.master.tasks[] | select(.id == 2)) |= (.previousStatus = .status | .status = "done")' \
  .taskmaster/tasks/tasks.json > /tmp/tasks_temp.json && \
  mv /tmp/tasks_temp.json .taskmaster/tasks/tasks.json
```

### Check parent task completion (if this is a subtask)
```bash
# Get parent task and check if all subtasks are done
jq '.master.tasks[] | select(.id == 2) | {
  id,
  title,
  all_subtasks_done: ([.subtasks[] | select(.status != "done")] | length == 0)
}' .taskmaster/tasks/tasks.json
```

### Find newly unblocked tasks
```bash
# Find tasks that depend on this task and are now unblocked
jq --argjson completed_id 2 '
  [.master.tasks[] |
   select(.status == "pending" or .status == "blocked") |
   select(.dependencies | contains([$completed_id])) |
   . + {
     all_deps_met: [
       .dependencies[] as $dep |
       select([.master.tasks[] | select(.id == $dep and .status != "done")] | length > 0)
     ] | length == 0
   }] |
  map(select(.all_deps_met)) |
  map({id, title, priority})
' .taskmaster/tasks/tasks.json
```

### Complete workflow with celebratory output
```bash
TASK_ID=2

# 1. Get task info
TASK_INFO=$(jq -r ".master.tasks[] | select(.id == $TASK_ID) | \"\(.title)\"" .taskmaster/tasks/tasks.json)

# 2. Mark as done
jq "(.master.tasks[] | select(.id == $TASK_ID)) |= (.previousStatus = .status | .status = \"done\")" \
  .taskmaster/tasks/tasks.json > /tmp/tasks_temp.json && \
  mv /tmp/tasks_temp.json .taskmaster/tasks/tasks.json

# 3. Get updated stats
echo "✅ Task Completed!"
echo ""
echo "Task #$TASK_ID: $TASK_INFO"
echo ""
jq -r '{
  total: (.master.tasks | length),
  done: [.master.tasks[] | select(.status == "done")] | length,
  in_progress: [.master.tasks[] | select(.status == "in-progress")] | length,
  pending: [.master.tasks[] | select(.status == "pending")] | length
} | "Progress: \(.done)/\(.total) tasks complete (\((.done / .total * 100) | floor)%)"' .taskmaster/tasks/tasks.json
```

**Reference**: See `packages/taskmaster-native/docs/jq-commands-reference.md` for complete jq command library.

## Tips

1. **Commit first**: Commit your changes before marking complete
2. **Test coverage**: Ensure tests are written and passing
3. **Documentation**: Update relevant docs before completing
4. **Review**: Consider code review before marking large tasks done
5. **Celebrate**: Take a moment to appreciate progress!

## Integration

Perfect for these workflows:
```bash
# Focused work session
/tm:work → /tm:complete → /tm:work → /tm:complete

# Review before complete
/tm:show 1.2 → /tm:complete 1.2

# Check progress
/tm:complete 1.2 → /tm:list → /tm:analyze
```
