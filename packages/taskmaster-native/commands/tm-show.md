---
description: Show detailed information about a specific task
argument-hint: <task-id>
---

Display detailed information for a specific task.

Arguments: $ARGUMENTS (required: task ID, e.g., "1" or "1.2")

## Show Task Details Process

1. **Validate arguments**
   - Ensure task ID is provided
   - If not, show error and suggest `/tm:list` to see available tasks

2. **Check initialization**
   - Use Read tool to verify `.taskmaster/tasks/tasks.json` exists
   - If not, suggest running `/tm:init` first

3. **Read and find task**
   - Use Read tool to load `.taskmaster/tasks/tasks.json`
   - Parse JSON and search for task with matching ID
   - Handle nested subtasks (e.g., ID "1.2.1")

4. **Display task details**
   Format output with all task information:
   ```
   📋 Task #1.2: Implement User Authentication

   Status: 🚧 in-progress
   Priority: 🔴 high

   Description:
   Set up JWT-based authentication system with secure token handling

   Details:
   - Use bcrypt for password hashing
   - Implement JWT token generation and validation
   - Add refresh token mechanism
   - Include rate limiting for auth endpoints

   Dependencies:
   - Task #1.1: Database setup (✅ done)

   Test Strategy:
   - Unit tests for auth functions
   - Integration tests for login/logout flow
   - Security testing for token validation

   Subtasks (2/3 completed):
   ✅ [1.2.1] Set up JWT library
   ✅ [1.2.2] Implement password hashing
   ⏳ [1.2.3] Add refresh token logic
   ```

5. **Show related actions**
   - Suggest `/tm:status <id> <status>` to update status
   - Suggest `/tm:expand <id>` if task needs breakdown
   - Suggest `/tm:next` to see what to work on next
   - If task has subtasks, suggest viewing them individually

6. **Handle errors gracefully**
   - If task ID not found, list available task IDs
   - Provide helpful suggestions
