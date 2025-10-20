# Task Master Native - Installation Guide

Complete installation and setup guide for Task Master Native plugin.

## Prerequisites

- **Claude Code** installed and working
- **No other requirements!** (That's the point! 🎉)

No API keys, no MCP server, no CLI installation needed.

## Installation Methods

### Method 1: From GitHub Marketplace (Recommended)

Once the repository is published:

```bash
# In Claude Code, add the marketplace
/plugin marketplace add eyaltoledano/claude-task-master

# Install the native plugin
/plugin install taskmaster-native@taskmaster
```

That's it! You're ready to use Task Master Native.

### Method 2: Local Development/Testing

For testing or contributing:

```bash
# Clone the repository
git clone https://github.com/eyaltoledano/claude-task-master.git
cd claude-task-master

# In Claude Code, add local marketplace
/plugin marketplace add .

# Install the plugin
/plugin install taskmaster-native@taskmaster
```

## Verification

After installation, verify it's working:

```bash
# Show help to confirm installation
/tm:help

# You should see the Task Master Native help text
```

## First Time Setup

### 1. Initialize Your Project

```bash
cd your-project/
/tm:init my-project
```

This creates:
```
.taskmaster/
├── tasks/
│   └── tasks.json          # Empty task database
├── docs/
│   └── example-prd.md      # PRD template
└── reports/                 # Analysis reports folder
```

### 2. Choose Your Workflow

**Option A: Start with a PRD (Recommended)**

1. Create a requirements document:
   ```bash
   vim .taskmaster/docs/requirements.md
   ```

2. Write your requirements (see [PRD Example](#prd-example) below)

3. Generate tasks:
   ```bash
   /tm:parse-prd .taskmaster/docs/requirements.md
   ```

4. Review generated tasks:
   ```bash
   /tm:list
   ```

**Option B: Add Tasks Manually**

```bash
# Add tasks one by one
/tm:add Implement user authentication
/tm:add Set up database schema
/tm:add Create API endpoints
```

### 3. Start Working

```bash
# Get AI-powered recommendation
/tm:next

# Or jump right in
/tm:work
```

## PRD Example

Here's a simple PRD to get started:

```markdown
# User Authentication System

## Overview
Implement secure user authentication for the web application.

## Features
- User registration with email verification
- Login/logout functionality
- Password reset flow
- Session management

## Requirements
- Use JWT for authentication tokens
- Bcrypt for password hashing
- Redis for session storage
- Rate limiting on auth endpoints

## Technical Details
- Node.js with Express backend
- PostgreSQL for user data
- JWT tokens with 1-hour expiry
- Refresh token mechanism

## Success Criteria
- Users can register and login securely
- Tokens expire and refresh properly
- All security best practices followed
- Comprehensive test coverage (>80%)
```

Save this to `.taskmaster/docs/auth-requirements.md` and run:
```bash
/tm:parse-prd .taskmaster/docs/auth-requirements.md
```

## Configuration

Task Master Native requires **zero configuration**! But you can customize if needed:

### Task Properties

When creating tasks, you can specify:

```json
{
  "id": 1,
  "title": "string",               // Required: Short task name
  "description": "string",          // Required: What needs to be done
  "status": "pending",              // pending|in-progress|done|blocked|deferred|cancelled
  "priority": "medium",             // low|medium|high
  "dependencies": [],               // Array of task IDs this depends on
  "details": "string",              // Optional: Implementation notes
  "testStrategy": "string",         // Optional: How to verify completion
  "subtasks": []                    // Optional: Nested subtasks array
}
```

### Git Integration (Optional)

Add `.taskmaster/tasks/tasks.json` to git for version control:

```bash
git add .taskmaster/
git commit -m "Add Task Master project structure"
```

Consider adding this to `.gitignore` if you don't want to track reports:
```
.taskmaster/reports/
```

## Team Setup

### Shared Project

For teams working on the same project:

1. **One person initializes**:
   ```bash
   /tm:init team-project
   ```

2. **Commit to git**:
   ```bash
   git add .taskmaster/
   git commit -m "Initialize Task Master"
   git push
   ```

3. **Team members pull**:
   ```bash
   git pull
   ```

4. **Everyone can now use**:
   ```bash
   /tm:list
   /tm:work
   ```

### Organization-Wide Deployment

Add to `.claude/settings.json` in your organization's repositories:

```json
{
  "extraKnownMarketplaces": {
    "task-master": {
      "source": {
        "source": "github",
        "repo": "eyaltoledano/claude-task-master"
      }
    }
  },
  "enabledPlugins": {
    "taskmaster-native": {
      "marketplace": "taskmaster"
    }
  }
}
```

Team members who trust the repository folder will automatically get the plugin installed.

## Updating

To update to the latest version:

```bash
# Update marketplace
/plugin marketplace update taskmaster

# Reinstall plugin
/plugin uninstall taskmaster-native
/plugin install taskmaster-native@taskmaster
```

## Uninstallation

To remove Task Master Native:

```bash
# Uninstall the plugin
/plugin uninstall taskmaster-native

# Optionally remove project files
rm -rf .taskmaster/
```

## Migrating from Original Task Master

If you're currently using the original Task Master with MCP:

### What Stays the Same
- `.taskmaster/tasks/tasks.json` format (100% compatible!)
- Task structure and IDs
- Workflow concepts

### What Changes
- No more MCP server setup
- No API keys needed
- Commands use `/tm:` prefix instead of MCP tools
- Agents use Claude Code's native Task tool
- File operations use Claude Code's Read/Write/Edit tools

### Migration Steps

1. **Install Native Plugin**:
   ```bash
   /plugin install taskmaster-native@taskmaster
   ```

2. **Your Existing Data Works!**:
   Your `.taskmaster/tasks/tasks.json` works as-is. No changes needed!

3. **Update Your Workflow**:

   Old (MCP):
   ```bash
   # Use MCP tools
   get_tasks
   next_task
   set_task_status
   ```

   New (Native):
   ```bash
   # Use slash commands
   /tm:list
   /tm:next
   /tm:status <id> <status>
   ```

4. **Remove Old MCP Config** (optional):
   If you want to fully switch, you can remove MCP configuration from `.mcp.json`

### Can I Use Both?

Yes! The native and MCP versions can coexist:
- They both use the same `.taskmaster/tasks/tasks.json`
- Use whichever interface you prefer
- Team members can use different versions

## Troubleshooting

### Plugin Not Found

```bash
# Ensure marketplace is added
/plugin marketplace add eyaltoledano/claude-task-master

# List available plugins
/plugin marketplace list
```

### Commands Not Working

```bash
# Verify plugin is installed
/plugin list

# Check for taskmaster-native in the list
# If not present, reinstall:
/plugin install taskmaster-native@taskmaster
```

### Permission Errors

Claude Code may ask for permission to:
- Read files (for loading tasks.json)
- Write files (for updating tasks.json)
- Execute commands (for running tests/builds)

Always review and approve these permissions when prompted.

### Tasks.json Not Found

```bash
# Initialize the project first
/tm:init

# Or check you're in the right directory
pwd
ls -la .taskmaster/
```

## Getting Help

### Built-in Help

```bash
/tm:help                    # General help
/tm:<command>              # Command-specific help (without arguments)
```

### Documentation

- [README](./README.md) - Full feature documentation
- [Command Reference](#) - Detailed command documentation
- [Examples](#) - Example workflows and use cases

### Support Channels

- [GitHub Issues](https://github.com/eyaltoledano/claude-task-master/issues)
- [GitHub Discussions](https://github.com/eyaltoledano/claude-task-master/discussions)

## Next Steps

After installation:

1. ✅ Initialize your project: `/tm:init`
2. ✅ Create or import tasks: `/tm:parse-prd` or `/tm:add`
3. ✅ Start working: `/tm:work`
4. ✅ Track progress: `/tm:list`, `/tm:complete`
5. ✅ Analyze project: `/tm:analyze`

Happy task managing! 🚀

---

**Remember**: Task Master Native requires **zero configuration**.
If you find yourself configuring API keys or setting up servers, you're using the wrong version! 😄
