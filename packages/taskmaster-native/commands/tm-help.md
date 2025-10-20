---
description: Show help for Task Master Native commands
---

# Task Master Native - Command Help

**Zero setup. No API keys. No MCP. Just Claude Code.**

## Quick Start

```bash
/tm:init              # Initialize in your project
/tm:parse-prd my.md   # Generate tasks from PRD
/tm:list              # See all tasks
/tm:next              # Get next task to work on
```

## Core Commands

### Project Setup
- `/tm:init [name]` - Initialize Task Master in current project
- `/tm:help` - Show this help message

### Task Management
- `/tm:list [filter]` - List all tasks (optional status filter)
- `/tm:show <id>` - Show detailed task information
- `/tm:add [desc]` - Add a new task
- `/tm:remove <id>` - Remove a task
- `/tm:status <id> <status>` - Update task status

### AI-Powered Features
- `/tm:parse-prd <file>` - Generate tasks from PRD document
- `/tm:expand <id>` - Break task into subtasks (using Claude)
- `/tm:next` - Get next recommended task
- `/tm:analyze` - Analyze project complexity

### Workflow Commands
- `/tm:work` - Start working (get next task, set to in-progress)
- `/tm:complete <id>` - Mark task done and suggest next task

## Task Statuses

- `pending` - Ready to work on
- `in-progress` - Currently being worked on
- `done` - Completed and verified
- `blocked` - Waiting on external factors
- `deferred` - Postponed for later
- `cancelled` - No longer needed

## Task IDs

- Main tasks: `1`, `2`, `3`
- Subtasks: `1.1`, `1.2`, `2.1`
- Sub-subtasks: `1.1.1`, `1.1.2`

## Examples

```bash
# Initialize and create tasks from PRD
/tm:init my-project
/tm:parse-prd .taskmaster/docs/requirements.md

# View and work on tasks
/tm:list pending
/tm:show 1
/tm:status 1 in-progress

# Break down complex tasks
/tm:expand 1
/tm:show 1.1

# Complete tasks
/tm:status 1.1 done
/tm:next
```

## Key Features

✨ **No External Dependencies**
- No API keys needed
- No MCP server setup
- No CLI installation
- Pure Claude Code native functionality

🚀 **AI-Powered**
- Parse PRDs into structured tasks
- Break complex tasks into subtasks
- Get intelligent next-task recommendations
- Analyze project complexity

📁 **File-Based**
- All data in `.taskmaster/tasks/tasks.json`
- Human-readable task structure
- Easy to version control
- Compatible with git workflows

## File Structure

```
.taskmaster/
├── tasks/
│   └── tasks.json          # All task data
├── docs/
│   ├── requirements.md     # Your PRDs
│   └── example-prd.md      # Template
└── reports/
    └── analysis.json       # Complexity reports
```

## Tips

1. **Start with a PRD**: Write requirements in `.taskmaster/docs/`, then use `/tm:parse-prd`
2. **Break down tasks**: Use `/tm:expand` on complex tasks to create subtasks
3. **Track progress**: Regularly use `/tm:status` to keep tasks updated
4. **Use `/tm:next`**: Let Claude suggest the best task to work on next
5. **Dependencies**: Add dependencies when creating tasks to maintain order

## Need More Help?

- View command details: `/tm:<command>` with no arguments shows usage
- Check task details: `/tm:show <id>` for specific task info
- List all tasks: `/tm:list` to see current project status

---

**Task Master Native** - Efficient task management powered by Claude Code
