---
description: Quick start - get next task and begin working
---

Quick command to get the next recommended task and immediately start working on it.

This is a convenience command that combines `/tm:next` and `/tm:status <id> in-progress`.

## Work Flow Process

1. **Check initialization**
   - Use Read tool to verify `.taskmaster/tasks/tasks.json` exists
   - If not, suggest running `/tm:init` first

2. **Check for in-progress tasks**
   - Use Read tool to load tasks
   - Count tasks with "in-progress" status
   - If too many (>2), show warning:
   ```
   ⚠️  You already have 3 tasks in progress:
   - Task #1.2: Implement password hashing
   - Task #3: Set up CI/CD
   - Task #5.1: Write API tests

   Consider completing these before starting new work.

   To proceed anyway: /tm:work force
   To complete a task: /tm:complete <id>
   ```

3. **Get next recommendation**
   - Use same logic as `/tm:next` command
   - Analyze tasks with Claude
   - Get best next task recommendation

4. **Update task status**
   - Change recommended task status from "pending" to "in-progress"
   - Update tasks.json using Write tool

5. **Display work session start**
   ```
   🚀 Starting Work Session

   Task #1.2: Implement Password Hashing
   Priority: 🔴 High
   Status: ⏳ Pending → 🚧 In Progress

   ═══════════════════════════════════════════════

   📋 TASK DETAILS

   Description:
   Set up secure password hashing using bcrypt with
   configurable salt rounds and proper error handling.

   Implementation Steps:
   1. Install bcrypt dependency
   2. Create hash utility module
   3. Implement hash generation function
   4. Implement hash comparison function
   5. Add error handling and logging
   6. Write comprehensive unit tests

   Test Strategy:
   - Unit tests for hash/compare functions
   - Test with various input scenarios
   - Verify salt randomness
   - Performance benchmarking

   Dependencies (all met):
   ✅ Task #1.1: Database setup

   ═══════════════════════════════════════════════

   💡 Suggested Approach:
   Start by installing bcrypt and creating a dedicated
   utilities folder for authentication helpers. Focus
   on getting basic hashing working first, then add
   robust error handling and edge case coverage.

   📝 Commands:
   - /tm:show 1.2        (detailed view anytime)
   - /tm:complete 1.2    (mark done when finished)
   - /tm:status 1.2 blocked (if you get stuck)

   Good luck! 🎯
   ```

6. **Save work session start time** (optional)
   - Track when task was started
   - Useful for velocity metrics

## Options

- `/tm:work` - Standard: Won't start if >2 tasks in progress
- `/tm:work force` - Force: Start new task even if others in progress

## When to Use

Perfect for:
- Starting your work day
- Beginning a new task after completing one
- Quick context switching
- Focused work sessions

## Examples

```bash
# Start working
/tm:work

# Force start (skip in-progress check)
/tm:work force
```

## Typical Daily Workflow

```bash
# Morning
/tm:work                    # Start first task

# After completing
/tm:complete 1.2            # Mark done, get next

# Continue working
/tm:work                    # Start next task

# End of day
/tm:list in-progress        # See what's in flight
```

## Tips

1. **Focus**: Try to limit to 1-2 in-progress tasks
2. **Context**: Review full task details before diving in
3. **Blockers**: Use `/tm:status <id> blocked` if you get stuck
4. **Updates**: Add notes during work with `/tm:update <id>`
