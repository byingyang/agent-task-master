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
   - Use Read tool to verify `.taskmaster/tasks/tasks.json` exists
   - If not, suggest running `/tm:init` first

3. **Read and validate task**
   - Use Read tool to load tasks
   - Find task with matching ID
   - Verify task exists
   - Check current status

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
   - Store previous status in `previousStatus` field
   - Update tasks.json using Write tool

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
