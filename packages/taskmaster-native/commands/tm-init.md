---
description: Initialize Task Master in the current project
argument-hint: [project-name]
---

Initialize a new Task Master project with native Claude Code integration.

Arguments: $ARGUMENTS

## Initialization Steps

1. **Check if already initialized**
   - Use Read tool to check if `.taskmaster/tasks/tasks.json` exists
   - If it exists, ask user if they want to reinitialize (warning: this will backup existing data)

2. **Create directory structure**
   - Create `.taskmaster/` directory
   - Create `.taskmaster/tasks/` subdirectory
   - Create `.taskmaster/docs/` subdirectory (for PRDs)
   - Create `.taskmaster/reports/` subdirectory (for analysis reports)

3. **Initialize tasks.json**
   - Create empty task structure:
   ```json
   {
     "master": {
       "tasks": []
     }
   }
   ```
   - Write to `.taskmaster/tasks/tasks.json` using Write tool

4. **Create example PRD template**
   - Create `.taskmaster/docs/example-prd.md` with template
   - Include instructions on how to write a good PRD

5. **Confirm initialization**
   - Display success message
   - Show created structure
   - Suggest next steps:
     * Create a PRD in `.taskmaster/docs/`
     * Run `/tm:parse-prd` to generate tasks
     * Run `/tm:list` to view tasks
     * Run `/tm:help` for more commands

## Notes
- No API keys needed
- No MCP setup required
- No external CLI installation needed
- Just pure Claude Code native functionality
