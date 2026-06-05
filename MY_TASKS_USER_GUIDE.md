# My Tasks Page - User Guide

## Overview
The enhanced "My Tasks" page now includes powerful features to help you prioritize, organize, and manage your tasks more efficiently.

---

## 🎯 Key Features

### 1. Visual Urgency Indicators

Your most important tasks are now clearly visible at a glance:

**Red Border & Background** = Overdue Tasks
- Tasks that have passed their deadline
- Requires immediate attention
- Example: Task due on June 1st, today is June 5th

**Yellow Background** = Urgent Tasks (Due Soon)
- Tasks due within the next 2 days
- Needs attention soon
- Example: Task due tomorrow or the day after

**Normal Styling** = Regular Tasks
- Tasks with normal deadlines
- Can be prioritized based on your workflow

#### Example View:
```
┌─────────────────────────────────────────────────┐
│ [P0] Fix critical bug          2 days overdue ❌ │  ← Red background
│ [P1] Review PR                  1d left ⚠️        │  ← Yellow background
│ [P2] Update documentation      10d left          │  ← Normal
└─────────────────────────────────────────────────┘
```

---

### 2. Better Deadline Display

Instead of just showing a date, you now see actionable information:

**Format:** `Xd left` or `X days overdue`

**Examples:**
- `2 days overdue` = 📍 Do this ASAP
- `1d left` = ⏰ Due tomorrow
- `5d left` = ✓ Some time this week
- `15d left` = 📅 Can be planned

**Hover:** Shows the exact date (e.g., "Friday, June 13, 2026")

---

### 3. Task Duration Indicator

See how long a task has been in its current status:

**Display:** `5d` shown on the right side of each task

**Hover Tooltip:** "In in progress for 5 days"

**Why This Helps:**
- Identifies stalled tasks (stuck in progress for too long)
- Shows task momentum (new tasks in backlog vs old tasks)
- Helps with capacity planning

**Example Interpretation:**
- `2d` = Recent, actively worked on ✓
- `10d` = Potentially blocked or low priority ⚠️
- `30d` = Definitely needs attention 🚨

---

### 4. Priority Stats Dashboard

Quick overview of your task distribution:

**Location:** In the filter/header area, always visible

**Display:**
```
🔴 2 Critical  🟠 3 High  🔵 5 Medium  |  10 total
```

**Color Meanings:**
- 🔴 Red = P0 - Critical (Must do immediately)
- 🟠 Orange = P1 - High (Do soon)
- 🔵 Blue = P2 - Medium (Important but not urgent)
- Gray = P3-P4 - Low (Nice to have)

**Uses:**
- Quick glance at workload distribution
- See if you're overloaded with critical tasks
- Plan your day based on task mix

---

### 5. Sorting Options

Choose how you want to view your tasks:

#### **Sort by Status** (Default)
- Groups by workflow: In Progress → Review → Blocked → Todo → Backlog → Done
- Best for: Following your natural workflow

#### **Sort by Deadline**
- Earliest deadlines first
- Best for: "What should I do first?"
- Shows urgent tasks immediately

#### **Sort by Priority**
- P0 (Critical) first, then P1, P2, P3, P4
- Best for: "What's most important?"
- Focus on what matters most

#### **Sort by Created**
- Newest or oldest tasks first
- Best for: "What did I just add?"
- See recent additions

**How to Use:**
1. Find the "Sort" dropdown in the header
2. Click to open options
3. Select your preferred sort
4. Tasks instantly reorganize

---

### 6. View Mode Toggle

Change how tasks are displayed:

#### **List View** (Default)
```
┌────────────────────────────────────────────────────────┐
│ [P0] Task Title with full details    5d left    5d ⭐ ✏️ 🔗 │
│ [P1] Another task                    In Progr   3d ⭐ ✏️ 🔗 │
│ [P2] Third task                      Backlog    1d ⭐ ✏️ 🔗 │
└────────────────────────────────────────────────────────┘
```
- Shows: Priority, Title, Deadline, Status, Duration, Actions
- Best for: Detailed view, full information visible
- Recommended for: Desktop users

#### **Compact View**
```
┌────────────────────────────────────────────────────────┐
│ [P0] Task Title                      5d left ⭐ ✏️ 🔗  │
│ [P1] Another task                    3d ⭐ ✏️ 🔗        │
│ [P2] Third task                      1d ⭐ ✏️ 🔗        │
└────────────────────────────────────────────────────────┘
```
- Shows: Priority, Title, Deadline, Status, Actions
- Hides: Task duration indicator
- Best for: More tasks on screen, quick scanning
- Recommended for: Mobile users, many tasks

**How to Toggle:**
1. Look for view icons in the header (📋 for list, 📊 for compact)
2. Click the icon you prefer
3. View preference is saved during your session

---

### 7. Keyboard Shortcuts

Power users can use keyboard shortcuts for faster workflow:

#### **Ctrl+K** (or **Cmd+K** on Mac)
- **Action:** Focus the search box
- **Use Case:** Quickly find a specific task
- **Flow:** Ctrl+K → type task name → press Enter/Escape

#### **Ctrl+N** (or **Cmd+N** on Mac)
- **Action:** Create a new task
- **Use Case:** Add a new task without clicking "Add Task"
- **Flow:** Ctrl+N → fill form → save

**Pro Tips:**
- Search works with task titles (case insensitive)
- Can create task even while scrolled to bottom
- Shortcuts work anywhere on the page

---

### 8. Sticky Filter Header

Filter controls always stay visible as you scroll:

**What Stays Visible:**
- Search box (with Ctrl+K hint)
- Status filter dropdown
- Sort dropdown
- View toggle buttons
- Priority stats dashboard

**Benefits:**
- Don't need to scroll back to top to filter
- Keep context while scrolling through tasks
- Change sort/view mid-scroll
- Always see priority stats

---

### 9. Better Task Grouping

Tasks are organized hierarchically:

```
Organization
  └─ Project 1
     └─ Task 1
     └─ Task 2
     └─ Task 3
  └─ Project 2
     └─ Task 4
     └─ Task 5

Status Overview
  └─ Organization shows: "3 active" when tasks are not Done/Archived
  └─ Each project shows count of matching tasks
```

**Navigation:**
- Click on organization name to go to org overview
- Click on project name to go to project dashboard
- Click on task to view full details
- Use "Add Task" button to add to specific project

---

## 💡 Common Workflows

### Workflow 1: "What should I do first?"
1. Use **Sort by Deadline**
2. Look for 🔴 **overdue** and 🟡 **urgent** tasks
3. Start with red-highlighted tasks
4. Work down the list

### Workflow 2: "Am I overloaded?"
1. Check **Priority Stats** in header
2. Count critical (P0) tasks
3. If > 5 P0 tasks, consider asking for help or deferring
4. Use **Sort by Priority** to see all critical tasks

### Workflow 3: "Find that one task I just created"
1. Use **Sort by Created** to see newest first
2. Or use **Ctrl+K** to search by name
3. Add to Priority List with ⭐ for quick access

### Workflow 4: "What's been stuck?"
1. Look at **Task Duration** column (e.g., "15d")
2. Any task > 7 days in same status should be checked
3. May need to: unblock, reassign, or cancel

### Workflow 5: "Compact view on mobile"
1. Use **Compact View** toggle
2. Fits more tasks on screen
3. Still shows all critical info
4. Easier to scroll on small screens

---

## 🎨 Color Meanings at a Glance

| Color | Meaning | Status | Action |
|-------|---------|--------|--------|
| 🔴 Red Border | Overdue | Task is late | Do immediately |
| 🟡 Yellow BG | Urgent | Due < 2 days | Schedule today |
| 🟠 Orange Stat | High Priority | P1 | Do soon |
| 🔴 Red Stat | Critical | P0 | Do first |
| 🔵 Blue Stat | Medium | P2 | Plan this week |
| ⚪ Gray | Low | P3-P4 | Can defer |

---

## 🔍 Search & Filter Tips

### Search
- **Case Insensitive:** Finds "Bug" and "bug"
- **Partial Matches:** Search "login" finds "Login form error"
- **Real-time:** Results update as you type
- **Keyboard:** Ctrl+K to focus search quickly

### Status Filter
- **All Statuses:** See everything
- **In Progress:** See what you're working on
- **Blocked:** See what needs attention
- **Review:** See PRs/tasks waiting for review
- **Done:** See completed work

### Combined Filtering
You can use search + status filter together:
1. Set Status Filter to "In Progress"
2. Search for "auth"
3. See only in-progress tasks with "auth" in title

---

## ⭐ Priority List Feature

### Adding to Priority List
1. Click the ⭐ star icon on any task
2. Task is added to "Floating Priority Panel"
3. See your priority tasks at a glance
4. Click star again to remove

### Benefits
- See your top priorities on dashboard
- Floating panel shows on every page
- Quick access to what matters most
- Can manage from multiple pages

---

## 📊 Status Meanings

| Status | Meaning | Next Action |
|--------|---------|------------|
| **In Progress** | Currently working | Complete or move to review |
| **Review** | Waiting for feedback | Get approval |
| **Blocked** | Waiting for external input | Unblock or escalate |
| **To Do** | Planned but not started | Start when ready |
| **Backlog** | Future work | Prioritize when needed |
| **Done** | Completed | Celebrate! 🎉 |
| **Archived** | Old task | Can restore if needed |

---

## 🚀 Pro Tips

1. **Use both Sort and Filter:** Status filter + Sort by Deadline = Perfect combo
2. **Check Duration:** Tasks stuck for 10+ days need action
3. **Morning Routine:** Sort by Deadline, handle red/yellow tasks first
4. **Compact View:** Use on mobile for better experience
5. **Keyboard Shortcuts:** Ctrl+K + Ctrl+N make you 2x faster
6. **Priority Stats:** Glance at header to see if overloaded
7. **Sticky Header:** Scroll freely knowing filters are always there

---

## ❓ FAQ

**Q: How do I know if a task is overdue?**
A: Look for RED BORDER and RED BACKGROUND. Deadline also shows "X days overdue" in red.

**Q: What does the number on the right mean (e.g., "5d")?**
A: It's how many days the task has been in its current status. Hover to see which status.

**Q: Can I use keyboard shortcuts on mobile?**
A: Mobile browsers may not support Ctrl+K. Use the search box directly instead.

**Q: Will my view preference (list vs compact) be saved?**
A: Yes, during your current session. Refreshing the page resets to list view.

**Q: How do I sort by deadline ascending vs descending?**
A: Currently sorts by soonest deadline first. Click sort again to see options.

**Q: Can I hide tasks I don't want to see?**
A: Yes! Use Status filter to show only what you need. Archived tasks are hidden by default.

**Q: What if I have 100 tasks? Can I manage them?**
A: Yes! Use:
- Sort by Deadline (see urgent first)
- Status Filter (show In Progress only)
- Search (find specific task)
- Compact View (more tasks on screen)

---

## 🎓 Getting Started

1. **First Visit:**
   - Notice the Priority Stats in header
   - Check how many critical tasks you have
   - Sort by Deadline to see what's urgent

2. **Daily Use:**
   - Start with Sort by Deadline
   - Handle red/yellow tasks first
   - Switch to Compact View if on mobile
   - Use Ctrl+K to quickly find tasks

3. **Task Management:**
   - Watch task duration (15d+ = investigate)
   - Update status as you work
   - Mark done when complete
   - Archive old tasks

---

## 📈 Metrics You'll See

- **Total Tasks:** Bottom right of stats
- **Critical Count:** Red badge in stats
- **Task Age:** Duration indicator per task
- **Days Left:** In deadline display
- **Active Count:** Per project/organization

---

## 🔄 Updates & Refreshes

- **Auto-Update:** Page refreshes task data periodically
- **Manual Update:** Close and reopen page to refresh
- **Real-time:** Changes made elsewhere update here
- **Sorting/Filtering:** Only affects display, not data

---

## 💪 Advanced Usage

### For Managers
- Use **Priority Stats** to see team workload
- Use **Sort by Priority** to ensure critical work is visible
- Use **Task Duration** to find blocked/stuck work
- Check **Status Filter** by "Blocked" to see issues

### For Individual Contributors
- Use **Sort by Deadline** for self-prioritization
- Use **Keyboard Shortcuts** for speed
- Use **Compact View** on mobile
- Use **⭐ Priority List** for focus

### For Teams
- Use **Organization grouping** to find cross-org work
- Use **Project grouping** to see project health
- Use **Status grouping** (with filter) to see workflow stage

---

## 📱 Mobile Experience

- **Responsive Design:** Works on all screen sizes
- **Touch Friendly:** Larger buttons and spacing
- **Compact View:** Recommended for phones
- **Keyboard:** Less useful on mobile (native keyboard limitations)
- **Search:** Focus on search for mobile use

---

## 🎯 Next Steps

1. ✅ Explore the new features
2. ✅ Try different sorting options
3. ✅ Test keyboard shortcuts
4. ✅ Use Compact View on mobile
5. ✅ Watch task duration metrics
6. ✅ Add critical tasks to Priority List

---

**Happy task managing! 🚀**

For feedback or issues, contact the product team.
