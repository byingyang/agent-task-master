---
description: Quick start - get next task and begin working
---

Quick command to get the next recommended task and immediately start working on it.

This is a convenience command that combines `/tm:next` and `/tm:status <id> in-progress`.

## Work Flow Process

1. **Check initialization**
   - Use Bash tool to verify `.taskmaster/tasks/tasks.json` exists: `test -f .taskmaster/tasks/tasks.json && echo "exists" || echo "not found"`
   - If not, suggest running `/tm:init` first

2. **Check for in-progress tasks efficiently**
   - **IMPORTANT**: For large tasks.json files (>25KB), do NOT use Read tool
   - Use Bash tool with jq to count in-progress tasks
   - See "Efficient File Operations" section below for specific commands
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
   - **CRITICAL**: For large files, use jq with temp file pattern (see below)

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

## Efficient File Operations for Large tasks.json Files

When tasks.json exceeds 25,000 characters, use these jq commands via Bash tool:

### Count in-progress tasks
```bash
jq '[.master.tasks[] | select(.status == "in-progress")] | length' .taskmaster/tasks/tasks.json
```

### Get in-progress tasks (for warning)
```bash
jq -r '.master.tasks[] | select(.status == "in-progress") | "\(.id): \(.title)"' .taskmaster/tasks/tasks.json
```

### Find next available task (combines tm-next logic)
```bash
# Get pending high-priority tasks with no dependencies
jq '.master.tasks[] | select(.status == "pending" and .priority == "high" and (.dependencies | length == 0))' .taskmaster/tasks/tasks.json | head -1
```

### Mark task as in-progress (surgical update)
```bash
TASK_ID=5

# Update status to in-progress
jq "(.master.tasks[] | select(.id == $TASK_ID)) |= (.previousStatus = .status | .status = \"in-progress\")" \
  .taskmaster/tasks/tasks.json > /tmp/tasks_temp.json && \
  mv /tmp/tasks_temp.json .taskmaster/tasks/tasks.json
```

### Complete workflow for /tm:work
```bash
# 1. Check if too many in-progress
IN_PROGRESS_COUNT=$(jq '[.master.tasks[] | select(.status == "in-progress")] | length' .taskmaster/tasks/tasks.json)

if [ "$IN_PROGRESS_COUNT" -gt 2 ]; then
  echo "⚠️  Warning: You have $IN_PROGRESS_COUNT tasks in progress"
  jq -r '.master.tasks[] | select(.status == "in-progress") | "  - Task #\(.id): \(.title)"' .taskmaster/tasks/tasks.json
  echo ""
  echo "Consider completing some before starting new work."
  exit 0
fi

# 2. Get next task (example: first pending high-priority task)
NEXT_TASK=$(jq '.master.tasks[] | select(.status == "pending" and .priority == "high") | {id, title}' .taskmaster/tasks/tasks.json | head -1)

if [ -z "$NEXT_TASK" ]; then
  echo "No high-priority tasks available. Checking all pending tasks..."
  NEXT_TASK=$(jq '.master.tasks[] | select(.status == "pending")' .taskmaster/tasks/tasks.json | head -1)
fi

# 3. Extract task ID
TASK_ID=$(echo "$NEXT_TASK" | jq -r '.id')

# 4. Mark as in-progress
jq "(.master.tasks[] | select(.id == $TASK_ID)) |= (.previousStatus = .status | .status = \"in-progress\")" \
  .taskmaster/tasks/tasks.json > /tmp/tasks_temp.json && \
  mv /tmp/tasks_temp.json .taskmaster/tasks/tasks.json

# 5. Display work session info
echo "🚀 Starting Work Session"
echo ""
jq -r ".master.tasks[] | select(.id == $TASK_ID) |
\"Task #\(.id): \(.title)
Priority: \(.priority)
Status: ⏳ Pending → 🚧 In Progress

Description:
\(.description)

Details:
\(.details // \"No details provided\")\"" .taskmaster/tasks/tasks.json
```

**Reference**: See `packages/taskmaster-native/docs/jq-commands-reference.md` for complete jq command library.

## Tips

1. **Focus**: Try to limit to 1-2 in-progress tasks
2. **Context**: Review full task details before diving in
3. **Blockers**: Use `/tm:status <id> blocked` if you get stuck
4. **Updates**: Add notes during work with `/tm:update <id>`
