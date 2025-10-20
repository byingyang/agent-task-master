---
description: Analyze project complexity and provide insights
---

Use Claude Code's AI to analyze the project's task complexity, identify bottlenecks, and provide strategic insights.

## Analyze Project Process

1. **Check initialization**
   - Use Read tool to verify `.taskmaster/tasks/tasks.json` exists
   - If not, suggest running `/tm:init` first

2. **Read all tasks**
   - Use Read tool to load `.taskmaster/tasks/tasks.json`
   - Parse complete task structure including all subtasks

3. **Analyze with Claude**
   Prompt Claude for comprehensive analysis:

   ```
   Perform a comprehensive analysis of this project's task structure and provide strategic insights.

   Project Tasks:
   <tasks-json>

   Analyze:

   1. **Complexity Distribution**
      - How many simple, moderate, and complex tasks?
      - Which tasks should be expanded into subtasks?
      - Are any tasks too granular or too broad?

   2. **Dependency Analysis**
      - Identify the critical path (longest dependency chain)
      - Find tasks that block many others (high-impact tasks)
      - Detect circular dependencies (if any)
      - Identify parallelization opportunities

   3. **Priority Assessment**
      - Are priorities aligned with dependencies?
      - Are high-priority tasks blocked by low-priority ones?
      - Recommend priority adjustments if needed

   4. **Progress Overview**
      - Completion percentage
      - Tasks in progress vs pending
      - Velocity insights (if previous status available)
      - Estimated remaining work

   5. **Risk Assessment**
      - Tasks without test strategies
      - Tasks lacking details
      - Long-blocked tasks
      - Bottlenecks and single points of failure

   6. **Recommendations**
      - Top 3 tasks to focus on next
      - Tasks that should be expanded
      - Tasks that could be simplified or merged
      - Dependency improvements
      - Priority adjustments

   Provide actionable, specific insights that help the team work more effectively.
   ```

4. **Parse Claude's analysis**
   - Extract all analysis sections
   - Format for clear, scannable display
   - Highlight critical issues

5. **Display analysis report**
   ```
   📊 Project Analysis Report
   ═══════════════════════════════════════════════

   📈 PROGRESS OVERVIEW
   ┌────────────────────────────────────────────┐
   │ Total Tasks: 15                            │
   │ ✅ Done: 4 (27%)                           │
   │ 🚧 In Progress: 2 (13%)                    │
   │ ⏳ Pending: 7 (47%)                        │
   │ 🚫 Blocked: 2 (13%)                        │
   └────────────────────────────────────────────┘

   🎯 COMPLEXITY BREAKDOWN
   • Simple tasks: 5
   • Moderate tasks: 7
   • Complex tasks: 3

   Recommendation: Consider expanding tasks #3 and #8
   into subtasks for better manageability.

   🔗 DEPENDENCY INSIGHTS
   Critical Path: Tasks 1 → 3 → 5 → 8 → 12 (5 tasks)
   Estimated critical path duration: ~3-4 weeks

   High-Impact Tasks (blocking multiple others):
   • Task #3: API Gateway Setup (blocks 5 tasks)
   • Task #5: Database Migration (blocks 3 tasks)

   Parallelization Opportunity: Tasks 2, 6, 7, and 9
   can be worked on simultaneously.

   ⚠️ RISK FACTORS
   • 3 tasks missing test strategies: #4, #7, #11
   • 2 tasks blocked for >1 week: #10, #13
   • Task #8 has unclear dependencies

   ⚡ TOP RECOMMENDATIONS

   1. 🔴 PRIORITY: Unblock task #3 (API Gateway)
      → This unblocks 5 other tasks and is on critical path
      → Has 2 dependencies that are done
      → Should be next focus

   2. 🟡 EXPAND: Break down task #8 (Complex Feature)
      → Currently too broad
      → Run: /tm:expand 8

   3. 🟢 PARALLELIZE: Start tasks #2, #6, #7 simultaneously
      → All have no dependencies
      → Good candidates for team distribution
      → Would improve overall velocity

   📋 DETAILED TASK INSIGHTS

   Tasks Needing Attention:
   • #4: Missing test strategy → Add testing approach
   • #10: Blocked for 8 days → Review blocker status
   • #13: Low priority but blocks #14 → Consider priority increase

   ═══════════════════════════════════════════════

   💡 Next Steps:
   - Review and address risk factors
   - Run /tm:expand 8 to break down complex task
   - Run /tm:next to get specific task recommendation
   - Consider team distribution for parallel tasks
   ```

6. **Save analysis report** (optional)
   - Write analysis to `.taskmaster/reports/analysis-<timestamp>.json`
   - Allow comparison with previous analyses

7. **Provide actionable commands**
   Based on analysis, suggest specific commands:
   ```
   Suggested Actions:
   - /tm:expand 8
   - /tm:status 3 in-progress
   - /tm:show 10 (review blocker)
   - /tm:add (add test strategy to #4)
   ```

## Analysis Categories

### Complexity Metrics
- Task count by complexity level
- Average subtask depth
- Tasks that should be broken down
- Tasks that might be over-engineered

### Dependency Health
- Dependency depth and breadth
- Circular dependency detection
- Critical path identification
- Bottleneck detection
- Parallelization opportunities

### Priority Alignment
- Priority vs. dependency consistency
- Misaligned priorities
- Recommended adjustments

### Progress Tracking
- Completion percentages
- Velocity trends (if data available)
- Estimated remaining work
- Milestone progress

### Risk Assessment
- Incomplete task definitions
- Missing test strategies
- Long-blocked tasks
- High-dependency tasks without backups

## Usage Tips

1. **Regular Analysis**: Run weekly to track project health
2. **Sprint Planning**: Run at sprint start to prioritize work
3. **Bottleneck Detection**: Run when velocity slows down
4. **Team Coordination**: Use for workload distribution
5. **Before Major Decisions**: Run before making structural changes

## Examples

```bash
# Run comprehensive analysis
/tm:analyze

# Typical use case
/tm:analyze              # See current state
/tm:expand 8            # Act on recommendation
/tm:next                # Get specific next task
```
