---
description: Get AI-powered recommendation for next task to work on
---

Use Claude Code's AI to intelligently recommend the best task to work on next based on dependencies, priorities, and project state.

## Get Next Task Process

1. **Check initialization**
   - Use Bash tool to verify `.taskmaster/tasks/tasks.json` exists: `test -f .taskmaster/tasks/tasks.json && echo "exists" || echo "not found"`
   - If not, suggest running `/tm:init` first

2. **Read tasks efficiently**
   - **IMPORTANT**: For large tasks.json files (>25KB), do NOT use Read tool
   - Use Bash tool with jq to extract only data needed for analysis
   - See "Efficient File Operations" section below for specific commands

3. **Analyze with Claude**
   Prompt Claude to analyze and recommend:

   ```
   Analyze the current project tasks and recommend the best task to work on next.

   Project Tasks:
   <tasks-json>

   Consider:
   1. **Dependencies**: Only suggest tasks whose dependencies are complete
   2. **Priority**: Favor high-priority tasks
   3. **Status**: Only suggest "pending" tasks
   4. **Blocked Tasks**: Avoid suggesting blocked tasks
   5. **Current Progress**: Consider what's already in-progress
   6. **Logical Flow**: Suggest tasks that make sense in current context
   7. **Complexity**: Balance between quick wins and important work

   Recommendation Criteria:
   - If high-priority tasks with met dependencies exist → suggest those
   - If multiple tasks are available → recommend the one that unblocks the most other tasks
   - If no high-priority tasks → suggest medium priority with best logical flow
   - If too many tasks in-progress → suggest completing those first

   Provide:
   1. Recommended task ID
   2. Clear reasoning for the recommendation
   3. Brief overview of the task
   4. Suggested approach for tackling it
   5. Estimated complexity (simple/moderate/complex)
   6. Any dependencies that were met to enable this task
   ```

4. **Parse Claude's recommendation**
   - Extract recommended task ID
   - Extract reasoning and approach
   - Format for clear display

5. **Display recommendation**
   ```
   🎯 Next Recommended Task: #1.2

   Task: Implement Password Hashing
   Priority: 🔴 High
   Status: ⏳ Pending
   Complexity: Moderate

   Why this task?
   - High priority security feature
   - Dependency #1.1 (Database Setup) is complete
   - Blocks 3 other tasks: #1.3, #1.4, #1.5
   - Good momentum builder for the auth system

   Suggested Approach:
   1. Install and configure bcrypt library
   2. Create password hashing utility functions
   3. Add salt generation with configurable rounds
   4. Implement password comparison function
   5. Write unit tests for all hash functions

   Ready to start?
   - /tm:status 1.2 in-progress  (mark as in progress)
   - /tm:show 1.2                (see full details)
   ```

6. **Show alternative options**
   If applicable, show 2-3 other good options:
   ```
   Other good options:
   - Task #2.1: Set up CI/CD pipeline (medium priority, unblocked)
   - Task #3: Write API documentation (low priority, no dependencies)
   ```

7. **Handle edge cases**
   - No available tasks: "All pending tasks are blocked or have unmet dependencies"
   - All tasks done: "🎉 Congratulations! All tasks are complete!"
   - Too many in-progress: "You have 3 tasks in-progress. Consider completing those first."
   - All tasks blocked: "All pending tasks are blocked. Review blockers with /tm:list blocked"

## Smart Features

The AI considers:
- **Dependency chains**: Won't suggest tasks with incomplete dependencies
- **Priority levels**: Balances urgency with feasibility
- **Current workload**: Accounts for already in-progress tasks
- **Task relationships**: Suggests tasks that make logical sense together
- **Blocking analysis**: Prioritizes tasks that unblock other work
- **Complexity**: Suggests appropriate difficulty for current context

## Usage Tips

1. **Regular Use**: Run `/tm:next` at the start of each work session
2. **After Completion**: Run after marking tasks done to get next suggestion
3. **When Stuck**: Use when unsure what to work on
4. **Sprint Planning**: Run to identify critical path tasks
5. **Team Coordination**: Use to avoid dependency conflicts

## Efficient File Operations for Large tasks.json Files

When tasks.json exceeds 25,000 characters, use these jq commands via Bash tool:

### Get all pending tasks
```bash
jq '.master.tasks[] | select(.status == "pending")' .taskmaster/tasks/tasks.json
```

### Get pending tasks with met dependencies
```bash
# Two-step approach: Get pending tasks, then check dependencies
# Step 1: Get all pending tasks with their dependencies
jq -c '.master.tasks[] | select(.status == "pending") | {id, title, priority, dependencies}' .taskmaster/tasks/tasks.json

# Step 2: For each pending task, verify dependencies are done
jq --argjson task_id 5 '
  .master.tasks[] |
  select(.id == $task_id and .status == "pending") |
  . + {
    unmet_deps: [
      .dependencies[] as $dep |
      select([.master.tasks[] | select(.id == $dep and .status != "done")] | length > 0) |
      $dep
    ]
  } |
  select(.unmet_deps | length == 0)
' .taskmaster/tasks/tasks.json
```

### Get high-priority pending tasks
```bash
jq '.master.tasks[] | select(.status == "pending" and .priority == "high")' .taskmaster/tasks/tasks.json
```

### Get available tasks (no dependencies or all dependencies met)
```bash
# Get tasks with no dependencies
jq '.master.tasks[] | select(.status == "pending" and (.dependencies | length == 0))' .taskmaster/tasks/tasks.json
```

### Count in-progress tasks (to warn if too many)
```bash
jq '[.master.tasks[] | select(.status == "in-progress")] | length' .taskmaster/tasks/tasks.json
```

### Get task statistics for recommendation
```bash
jq '{
  total: (.master.tasks | length),
  done: [.master.tasks[] | select(.status == "done")] | length,
  in_progress: [.master.tasks[] | select(.status == "in-progress")] | length,
  pending: [.master.tasks[] | select(.status == "pending")] | length,
  blocked: [.master.tasks[] | select(.status == "blocked")] | length,
  high_priority_pending: [.master.tasks[] | select(.status == "pending" and .priority == "high")] | length
}' .taskmaster/tasks/tasks.json
```

### Find tasks that block many others (high impact)
```bash
# Find how many tasks depend on each task
jq '[.master.tasks[] | . + {
  blocks_count: [.. | .dependencies[]? | select(. == .id)] | length
}] | sort_by(.blocks_count) | reverse | .[:5]' .taskmaster/tasks/tasks.json
```

**Reference**: See `packages/taskmaster-native/docs/jq-commands-reference.md` for complete jq command library.

## Examples

```bash
# Get next task recommendation
/tm:next

# After completing a task
/tm:status 1.2 done
/tm:next
```

## Integration with Workflow

Typical workflow:
```bash
/tm:next                    # Get recommendation
/tm:show <id>               # Review task details
/tm:status <id> in-progress # Start working
# ... do the work ...
/tm:status <id> done        # Mark complete
/tm:next                    # Get next task
```
