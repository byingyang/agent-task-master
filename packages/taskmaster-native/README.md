# Task Master Native

**Zero setup. No API keys. No MCP. Pure Claude Code integration.**

Task Master Native is a lightweight, native Claude Code plugin for intelligent task management. Unlike the original Task Master which requires MCP server setup and API keys, this native version works entirely through Claude Code's built-in capabilities.

## Features

✨ **Zero External Dependencies**
- No MCP server setup required
- No API keys to configure
- No CLI installation needed
- Just install and start using

🤖 **AI-Powered with Claude Code**
- Parse PRDs into structured tasks using Claude
- Break down complex tasks into subtasks intelligently
- Get AI-powered next-task recommendations
- Analyze project complexity and dependencies

📁 **Simple File-Based Storage**
- All data in `.taskmaster/tasks/tasks.json`
- Human-readable JSON format
- Easy to version control with git
- No database setup needed

🚀 **Intuitive Commands**
- `/tm:init` - Initialize project
- `/tm:list` - View all tasks
- `/tm:next` - Get AI recommendation
- `/tm:work` - Start working immediately
- `/tm:complete` - Mark done and get next
- `/tm:parse-prd` - Generate tasks from requirements
- ...and more!

🎯 **Smart Agents**
- **task-planner**: Strategic task coordination
- **task-implementer**: Focused execution
- **task-reviewer**: Quality assurance

## Quick Start

### 1. Install Plugin

```bash
# Add marketplace (if not already added)
/plugin marketplace add eyaltoledano/claude-task-master

# Install taskmaster-native
/plugin install taskmaster-native@taskmaster
```

### 2. Initialize Project

```bash
/tm:init my-project
```

This creates the `.taskmaster/` directory structure with empty tasks.json.

### 3. Create Tasks

**Option A: Generate from PRD**

```bash
# Create a requirements document
# Edit .taskmaster/docs/requirements.md

# Generate tasks automatically
/tm:parse-prd .taskmaster/docs/requirements.md
```

**Option B: Add manually**

```bash
/tm:add Implement user authentication system
```

### 4. Start Working

```bash
# Get next recommended task
/tm:next

# Or start immediately
/tm:work
```

### 5. Track Progress

```bash
# Mark task complete
/tm:complete 1

# Or update status manually
/tm:status 1 done

# View all tasks
/tm:list
```

## Core Commands

### Project Setup
- `/tm:init [name]` - Initialize Task Master in current project
- `/tm:help` - Show command help

### Task Management
- `/tm:list [filter]` - List all tasks (with optional filter)
- `/tm:show <id>` - Show detailed task information
- `/tm:add [desc]` - Add a new task
- `/tm:remove <id>` - Remove a task
- `/tm:status <id> <status>` - Update task status

### AI-Powered Features
- `/tm:parse-prd <file>` - Generate tasks from PRD document
- `/tm:expand <id>` - Break task into subtasks using AI
- `/tm:next` - Get next recommended task
- `/tm:analyze` - Analyze project complexity

### Workflow Commands
- `/tm:work` - Get next task and start working
- `/tm:complete <id>` - Mark done and get next recommendation

## Task Statuses

- `pending` - Ready to work on
- `in-progress` - Currently being worked on
- `done` - Completed and verified
- `blocked` - Waiting on external factors
- `deferred` - Postponed for later
- `cancelled` - No longer needed

## Task ID Format

- Main tasks: `1`, `2`, `3`, etc.
- Subtasks: `1.1`, `1.2`, `2.1`, etc.
- Sub-subtasks: `1.1.1`, `1.1.2`, etc.

## File Structure

```
.taskmaster/
├── tasks/
│   └── tasks.json          # Single source of truth for all tasks
├── docs/
│   ├── requirements.md     # Your PRD files
│   └── example-prd.md      # Template for PRD creation
└── reports/
    └── analysis.json       # Complexity analysis reports
```

## Task Object Structure

```json
{
  "id": 1,
  "title": "Implement user authentication",
  "description": "Set up JWT-based auth system with secure token handling",
  "status": "pending",
  "priority": "high",
  "dependencies": [],
  "details": "Use bcrypt for password hashing, JWT for tokens...",
  "testStrategy": "Unit tests for auth functions, integration tests for flow",
  "subtasks": []
}
```

## Example Workflows

### Daily Development

```bash
# Start your day
/tm:list pending
/tm:work

# Complete tasks
/tm:complete 1
/tm:work

# End of day
/tm:list in-progress
```

### PRD-Driven Development

```bash
# Write requirements
vim .taskmaster/docs/sprint-1.md

# Generate tasks
/tm:parse-prd .taskmaster/docs/sprint-1.md

# Analyze and plan
/tm:analyze

# Break down complex tasks
/tm:expand 3

# Start working
/tm:work
```

### Sprint Planning

```bash
# Analyze project
/tm:analyze

# View all pending
/tm:list pending

# Identify next priorities
/tm:next

# Break down tasks
/tm:expand 2
/tm:expand 5

# Start sprint
/tm:work
```

## AI Agents

### task-planner
Strategic coordination agent that:
- Analyzes task queue and dependencies
- Identifies parallel work opportunities
- Creates execution strategies
- Detects bottlenecks and risks

**Use when:**
- Starting a new work session
- Planning sprint work
- Need to understand project status
- Want to coordinate multiple tasks

```bash
# Task planner is automatically used by /tm:next and /tm:analyze
# Or invoke directly via Task tool when needed
```

### task-implementer
Focused execution agent that:
- Implements specific tasks end-to-end
- Follows test strategies
- Updates progress tracking
- Ensures quality delivery

**Use when:**
- Need to implement a specific task
- Want focused execution without distractions
- Working through subtasks sequentially
- Need consistent quality standards

### task-reviewer
Quality assurance agent that:
- Reviews completed implementations
- Validates test coverage
- Checks code quality
- Provides constructive feedback

**Use when:**
- Task is complete and ready for review
- Want quality validation before marking done
- Need code review feedback
- Ensuring standards are met

## Writing Good PRDs

For best task generation results, your PRD should include:

### 1. Overview
- What you're building
- Why it's needed
- High-level goals

### 2. Features
- List of capabilities
- User stories
- Feature descriptions

### 3. Requirements
- Functional requirements
- Non-functional requirements
- Constraints and limitations

### 4. Technical Details
- Architecture decisions
- Tech stack
- APIs and integrations
- Data models

### 5. Success Criteria
- Measurable outcomes
- Acceptance criteria
- Testing requirements

### Example PRD Template

See `.taskmaster/docs/example-prd.md` after running `/tm:init`

## Tips & Best Practices

1. **Start with a PRD**: Write clear requirements before generating tasks
2. **Break down complexity**: Use `/tm:expand` on tasks that seem too large
3. **Track dependencies**: Add dependencies when creating tasks
4. **Regular updates**: Use `/tm:status` to keep tasks current
5. **Use `/tm:next`**: Let Claude suggest the best task to work on
6. **Review regularly**: Run `/tm:analyze` weekly to track health
7. **Focus work**: Limit in-progress tasks to 1-2 at a time
8. **Document blockers**: Use `blocked` status and document why
9. **Celebrate wins**: Use `/tm:complete` to track progress
10. **Version control**: Commit tasks.json changes with your code

## Comparison with Original Task Master

| Feature | Task Master (Original) | Task Master Native |
|---------|----------------------|-------------------|
| API Keys | Required | None needed |
| MCP Server | Required | Not needed |
| CLI Installation | Required | Not needed |
| Setup Complexity | Medium | Zero |
| AI Features | Via external APIs | Via Claude Code |
| Task Storage | tasks.json | tasks.json |
| Command Style | MCP tools | Slash commands |
| Agent Support | Yes (via MCP) | Yes (native) |
| File Operations | Via CLI | Via Claude Code tools |

## Troubleshooting

### "Tasks.json not found"
Run `/tm:init` to initialize the project

### "Cannot parse PRD"
Ensure PRD file exists and has clear, structured content

### "No tasks available"
- Run `/tm:list` to see all tasks
- Run `/tm:add` to create tasks manually
- Run `/tm:parse-prd` to generate from PRD

### "All tasks blocked"
- Review blockers with `/tm:list blocked`
- Update blocked tasks with `/tm:status <id> pending`
- Document blocker resolution

## Contributing

This plugin is part of the [Task Master AI](https://github.com/eyaltoledano/claude-task-master) project.

## License

MIT WITH Commons-Clause

## Support

- [GitHub Issues](https://github.com/eyaltoledano/claude-task-master/issues)
- [Documentation](https://github.com/eyaltoledano/claude-task-master#readme)

---

**Task Master Native** - Efficient task management powered by Claude Code
No setup. No API keys. Just intelligent task management.
