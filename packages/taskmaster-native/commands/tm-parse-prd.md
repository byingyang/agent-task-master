---
description: Parse a PRD document and generate structured tasks
argument-hint: <prd-file-path>
---

Parse a Product Requirements Document and automatically generate structured tasks using Claude Code's AI.

Arguments: $ARGUMENTS (required: path to PRD file, e.g., `.taskmaster/docs/requirements.md`)

## Parse PRD Process

1. **Validate arguments**
   - Ensure PRD file path is provided
   - Check file exists using Read tool
   - Support .md, .txt file formats

2. **Check initialization**
   - Use Read tool to verify `.taskmaster/tasks/tasks.json` exists
   - If not, suggest running `/tm:init` first

3. **Read PRD content**
   - Use Read tool to load the PRD file
   - Extract all content for analysis

4. **Analyze PRD with Claude**
   Prompt Claude to analyze the PRD and generate tasks:

   ```
   Analyze the following Product Requirements Document and generate a structured task breakdown.

   PRD Content:
   <prd-content>

   Generate tasks following this structure:
   1. Each task should have:
      - A clear, concise title
      - Detailed description of what needs to be done
      - Priority level (high/medium/low)
      - Suggested test strategy
      - Implementation details if applicable

   2. Break down complex features into logical tasks
   3. Identify dependencies between tasks
   4. Suggest a reasonable order for implementation

   Output as JSON array of task objects with this structure:
   {
     "title": "string",
     "description": "string",
     "priority": "high|medium|low",
     "details": "string",
     "testStrategy": "string",
     "dependencies": []
   }
   ```

5. **Parse Claude's response**
   - Extract JSON array of tasks from response
   - Validate task structure
   - Assign sequential IDs (continue from existing highest ID)
   - Set all new tasks to "pending" status

6. **Read existing tasks**
   - Use Read tool to load current `.taskmaster/tasks/tasks.json`
   - Parse existing tasks

7. **Merge tasks**
   - Add new tasks to existing task array
   - Maintain task order by ID
   - Preserve existing task data

8. **Write updated tasks**
   - Use Write tool to save complete tasks.json
   - Format JSON properly

9. **Confirm generation**
   Display summary:
   ```
   ✅ PRD parsed successfully!

   Generated 8 new tasks from requirements.md:
   - 3 high priority tasks
   - 4 medium priority tasks
   - 1 low priority task

   Task IDs: #7 through #14

   Next steps:
   - Run /tm:list to see all tasks
   - Run /tm:expand <id> to break down complex tasks
   - Run /tm:next to start working
   - Run /tm:analyze to see complexity analysis
   ```

## PRD Format Tips

Your PRD should include:
- **Overview**: What you're building and why
- **Features**: List of features and capabilities
- **Requirements**: Specific requirements and constraints
- **Technical Details**: Architecture, tech stack, APIs
- **Success Criteria**: How to measure completion

## Example PRD

```markdown
# User Authentication System

## Overview
Implement a secure JWT-based authentication system for our web application.

## Features
- User registration with email verification
- Login/logout functionality
- Password reset flow
- Session management
- Role-based access control

## Requirements
- Use JWT for tokens
- Bcrypt for password hashing
- Redis for session storage
- Rate limiting on auth endpoints
- MFA support (future enhancement)

## Technical Details
- Node.js backend with Express
- PostgreSQL for user data
- JWT tokens with 1-hour expiry
- Refresh token mechanism

## Success Criteria
- Users can register and login securely
- Tokens expire and refresh properly
- All security best practices followed
- Comprehensive test coverage
```

## Error Handling

- If PRD file not found, show helpful error
- If PRD is empty, suggest adding content
- If Claude cannot parse PRD, ask for clarification
- If task generation fails, allow retry

## Examples

```bash
/tm:parse-prd .taskmaster/docs/requirements.md
/tm:parse-prd docs/feature-spec.txt
/tm:parse-prd sprint-planning.md
```
