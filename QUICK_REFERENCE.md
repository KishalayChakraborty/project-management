# My Tasks - Quick Reference Guide

## 🎯 What Changed?

### Visual Indicators
```
BEFORE:                          AFTER:
[P1] Task Title      June 15    [P1] Task Title    2 days overdue 🔴
[P0] Task Title      June 10    [P0] Task Title    1d left ⚠️ 
[P2] Task Title      June 20    [P2] Task Title    5d left

No visual urgency               Red/Yellow highlighting for urgent
```

### Task Information
```
BEFORE:                          AFTER:
[P1] Fix bug          Review    [P1] Fix bug          Review  3d
(No duration info)               (Shows days in status)

No context about task age       See how long task stuck in status
```

### Header/Filters
```
BEFORE:                          AFTER:
🔍 Search | Status ▼            🔍 Search | Status ▼ | Sort ▼ | 👁️
                                 🔴2 Critical 🟠3 High 🔵5 Med | 10 total
                                 (Priority stats always visible)
                                 (Sticky while scrolling)
```

---

## 🎮 How to Use

### 1️⃣ Find Urgent Tasks Quickly
```
Method A (Best for overdue):
1. Look for RED BORDER + RED BACKGROUND
2. Address immediately

Method B (Best for planning):
1. Click Sort dropdown → "Sort: Deadline"
2. Handle red/yellow tasks first
3. Work down the list
```

### 2️⃣ Check Your Workload
```
1. Glance at Priority Stats in header
2. Count red (Critical) tasks
3. If > 5, consider deferring
4. Click Sort dropdown → "Sort: Priority" to see all P0s
```

### 3️⃣ Find a Specific Task
```
Method A (Fastest):
1. Press Ctrl+K (or Cmd+K)
2. Type task name
3. Press Enter

Method B (Browsing):
1. Use Status filter to narrow
2. Scroll through list
3. Click task to open
```

### 4️⃣ Create New Task
```
Method A (Keyboard - Fastest):
1. Press Ctrl+N (or Cmd+N)
2. Fill form
3. Save

Method B (Mouse):
1. Click "Add Task" button
2. Select organization
3. Select project
4. Fill form
5. Save
```

### 5️⃣ Change How You View Tasks
```
Toggle View:
[📋] = List view (detailed, all info visible)
[📊] = Compact view (minimal spacing, more tasks)

Change Sort:
Sort ▼ dropdown → Select option → Tasks reorganize
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | When to Use |
|----------|--------|------------|
| **Ctrl+K** / **Cmd+K** | Focus search | Find specific task |
| **Ctrl+N** / **Cmd+N** | New task | Add task quickly |

---

## 🎨 Visual Legend

### Colors & Their Meanings

| Visual | Meaning | What to Do |
|--------|---------|-----------|
| 🔴 Red border + BG | **Overdue** | Do immediately |
| 🟡 Yellow background | **Urgent** (< 2 days) | Schedule today |
| 🟠 Orange number in stats | **High priority (P1)** | Do soon |
| 🔴 Red number in stats | **Critical (P0)** | Do first |
| 🔵 Blue number in stats | **Medium (P2)** | Plan this week |

### Task Row Example
```
[P0] Review critical PR          5d left    5d  ⭐  ✏️  🔗
 │                                │        │   │   │   │
 │                                │        │   │   │   └─ Open task
 │                                │        │   │   └───── Edit task
 │                                │        │   └───────── Add to priority list
 │                                │        └───────────── Days in status
 │                                └────────────────────── Deadline
 └──────────────────────────────────────────────────────── Task title
 Priority
```

---

## 📊 Status Filter Reference

| Status | Meaning | Use When |
|--------|---------|----------|
| **All Statuses** | Show everything | Overview |
| **In Progress** | Currently working | See active work |
| **Blocked** | Waiting for something | Find blockers |
| **Review** | Awaiting approval | Check reviews |
| **To Do** | Planned, not started | Plan sprints |
| **Backlog** | Future work | Long-term planning |
| **Done** | Completed | Celebrate wins |

---

## 🔀 Sorting Options

| Sort By | Order | Best For |
|---------|-------|----------|
| **Status** | In Progress → Done → Archived | Following workflow |
| **Deadline** | Earliest → Latest | "What's urgent?" |
| **Priority** | P0 → P4 | "What's important?" |
| **Created** | Newest → Oldest | "What's new?" |

---

## 💡 Common Scenarios

### "My day just started, what should I do?"
```
1. Sort by Deadline (click Sort dropdown)
2. Look for 🔴 RED tasks
3. Start from top
```

### "I think I'm overloaded"
```
1. Check Priority Stats header
2. Count 🔴 red numbers (critical)
3. If > 5, escalate or defer
```

### "Where's that task I created?"
```
Option A (Fastest):
- Ctrl+K → type name → search

Option B:
- Sort by Created → Find at top
```

### "Task is stuck, what's happening?"
```
1. Look at task duration (e.g., "15d")
2. If in progress 15+ days → likely blocked
3. Click task → investigate → update status
```

### "Too many tasks on screen"
```
1. Click 📊 Compact view button
2. More tasks visible
3. Still shows all important info
```

### "I'm on mobile, interface is cramped"
```
1. Click 📊 Compact view button
2. Search for specific tasks
3. Minimize scrolling
```

---

## 🚨 Urgency Levels at a Glance

```
CRITICAL (Do now):
- Red border + background
- Days overdue > 0
- Priority P0
- Action: Stop everything, do this

URGENT (Do today):
- Yellow background
- 1-2 days left
- Priority P1
- Action: Make this top priority

NORMAL (Do soon):
- No special styling
- 3-7 days left
- Priority P2-P3
- Action: Plan into schedule

LOW PRIORITY (Can defer):
- No special styling
- > 7 days left
- Priority P4
- Action: Come back later
```

---

## 📈 Metrics Explained

### Priority Stats
```
🔴 2 Critical  🟠 3 High  🔵 5 Medium  |  10 total

🔴 2      = How many P0 tasks
🟠 3      = How many P1 tasks
🔵 5      = How many P2 tasks
10 total  = Total task count
```

**Use Case:** Quick health check at start of day

### Task Duration
```
In progress    5d
└─ This task is in "In progress" status for 5 days
```

**Use Case:** Identify stalled work

### Days Left
```
1d left      = Due tomorrow (plan today)
-2 days      = 2 days overdue (urgent!)
5d left      = Due in 5 days (schedule this week)
```

**Use Case:** Deadline-based prioritization

---

## ✅ Best Practices

1. **Start Each Day:**
   - ✓ Sort by Deadline
   - ✓ Handle red/yellow tasks
   - ✓ Check Priority Stats

2. **During Day:**
   - ✓ Update task status as you work
   - ✓ Watch for stalled tasks (15+ days)
   - ✓ Use search to find tasks

3. **End of Day:**
   - ✓ Mark done tasks as "Done"
   - ✓ Update blocked tasks to "Blocked"
   - ✓ Review tomorrow's urgent tasks

4. **Keyboard Power Users:**
   - ✓ Use Ctrl+K for search
   - ✓ Use Ctrl+N for new tasks
   - ✓ Minimize mouse usage

5. **Mobile Users:**
   - ✓ Use Compact view
   - ✓ Use search (not keyboard shortcuts)
   - ✓ Focus on screen size optimization

---

## 🆘 Troubleshooting

**Q: I don't see the Priority Stats**
A: Scroll to top of task list, check header area

**Q: The "5d" duration isn't showing**
A: Might be in Compact view, switch to List view

**Q: Keyboard shortcut didn't work**
A: Make sure page has focus, try clicking page first

**Q: Sort changed but tasks didn't reorder**
A: Page might need refresh, try F5

**Q: On mobile, buttons are hard to click**
A: Switch to Compact view, larger tap targets

---

## 🎯 Power User Tips

1. **Search + Filter Combo:**
   - Status filter to "In Progress"
   - Search for "auth"
   - See only in-progress auth-related tasks

2. **Morning Workflow:**
   - Ctrl+K → search for overdue
   - Sort by Deadline
   - Batch similar tasks together

3. **Afternoon Review:**
   - Sort by Priority
   - Check if P0s are progressing
   - Move completed tasks to Done

4. **End of Week:**
   - Sort by Created
   - Archive old tasks
   - Plan next week's critical items

5. **Team Standup:**
   - Use Priority Stats to explain workload
   - Show blocked tasks for discussion
   - Highlight urgent items

---

## 📱 Mobile vs Desktop

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Keyboard Shortcuts | ✅ Works great | ⚠️ Limited |
| List View | ✅ Full details | ⚠️ Cramped |
| Compact View | ✅ Optional | ✅ Recommended |
| Search | ✅ Fast | ✅ Good |
| Sorting | ✅ All options | ✅ All options |
| Touch Targets | ✅ Precise | ✅ Large |

---

## 🔄 Workflow Examples

### Workflow 1: "Manage By Deadline"
```
1. Sort by Deadline
2. See urgent tasks at top
3. Work from top to bottom
4. Update status as you go
```

### Workflow 2: "Manage By Priority"
```
1. Sort by Priority
2. Handle all P0s first
3. Then P1s
4. Then rest
```

### Workflow 3: "Find Blockers"
```
1. Status filter → Blocked
2. See all blocked tasks
3. Identify blockers
4. Escalate or unblock
```

### Workflow 4: "Overview Check"
```
1. Check Priority Stats
2. Sort by Priority
3. See overall health
4. Plan actions
```

### Workflow 5: "Focus Mode"
```
1. Add critical tasks to ⭐ priority list
2. View only priority tasks
3. Minimize distractions
4. Complete focused work
```

---

## 🎓 Getting Started (5 minutes)

1. **Open My Tasks page**
   - Notice header and filters

2. **Check Priority Stats**
   - Understand your workload

3. **Try Sort dropdown**
   - See tasks reorganize

4. **Find urgent task**
   - Look for red border

5. **Try keyboard shortcut**
   - Press Ctrl+K, search something

6. **Try view toggle**
   - Click 📊 for compact view

**You're now a power user! 🚀**

---

## 📞 Still Need Help?

- Check MY_TASKS_USER_GUIDE.md for detailed info
- Check DEVELOPER_GUIDE.md for technical details
- See IMPLEMENTATION_SUMMARY.md for full feature list
- Contact product team with feedback

---

**Last Updated:** June 2026
**Version:** 1.0
**Status:** ✅ Production Ready
