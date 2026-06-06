# Work Sessions Quick Start Guide

## For Users: How to Track Your Work Time

### Starting a Work Session

1. Navigate to a task detail page (in "My Work" section)
2. Click the **"Start work session"** button at the top right
3. The work session widget appears on the right sidebar
4. Timer starts immediately

**Note**: You can only have ONE active work session per project at a time. If you try to start work on a second task, the button will be disabled until you stop the first session.

### Managing an Active Session

#### While Working (ACTIVE state)
The widget shows:
- Task name
- Real-time timer (HH:MM:SS format)
- **Pause** button: Freeze the timer temporarily
- **Stop** button: End session and create work log

#### After Pausing (PAUSED state)
- Timer freezes at current time
- **Resume** button: Continue from where you paused
- **Stop** button: Still available to end session

### Stopping a Session

When you click **Stop**:
1. Session closes
2. Work log is automatically created
3. Work log segments track each pause/resume cycle
4. Duration is calculated from all segments
5. You're returned to the task view with work log visible

## For Admins: Viewing Work Logs

### Team Work Logs
- Visit: `/orgs/[orgId]/projects/[projectId]/work-logs`
- See work logs from all team members
- Filter by user, date range
- Sort by date, duration, user name
- Search by user email/name

### Individual User Work Logs
Users can view their own work logs:
- Visit: `/orgs/[orgId]/my-work/[projectId]/work-logs`
- See only their work logs for the project
- Same filtering and sorting options as team view

## Understanding the Work Log

Each work log entry shows:
- **User**: Who logged the time
- **Date**: When the work was completed
- **Duration**: Total time spent (H:MM format)
- **Task**: Which task was worked on
- **Segments**: Individual time intervals
  - Shows start/end times for each pause/resume cycle

Example: If a user:
1. Started at 10:00 AM
2. Paused at 10:45 AM (45 min)
3. Resumed at 11:00 AM
4. Paused at 11:30 AM (30 min)
5. Resumed at 12:00 PM
6. Stopped at 12:30 PM (30 min)

The work log shows:
- **Total Duration**: 1h 45m
- **Segments**:
  - 10:00 AM – 10:45 AM (45m)
  - 11:00 AM – 11:30 AM (30m)
  - 12:00 PM – 12:30 PM (30m)

## Key Features

✅ **Real-time Timer**: Updates every second
✅ **Pause/Resume**: Freeze timer without losing progress
✅ **Automatic Work Logs**: Create work logs without manual entry
✅ **One Task at a Time**: Per project constraint prevents multitasking
✅ **Multi-Project Support**: Work on different projects simultaneously
✅ **Segment Tracking**: Records each pause/resume cycle
✅ **Auto-totaling**: Duration calculated automatically

## Constraints & Limitations

### Per Project
- ❌ Cannot have 2 active sessions in the same project
- ✅ Each project is independent
- ✅ Can work on 5 different projects at once

### Per Organization
- ✅ Can work on multiple projects across different orgs
- Example: 1 active session in "Company A" + 1 active session in "Company B"

### Session Management
- ❌ Cannot edit a session once started (only pause/resume)
- ❌ Cannot retroactively create sessions (must start in real-time)
- ✅ Work logs can be reviewed and filtered after completion

## API Reference (For Developers)

### Endpoints

```
GET    /orgs/[orgId]/projects/[projectId]/work-sessions
       → Get active session for current user

POST   /orgs/[orgId]/projects/[projectId]/work-sessions
       → Start new session
       → Body: { taskId: string }

POST   /orgs/[orgId]/projects/[projectId]/work-sessions/[sessionId]/pause
       → Pause active session

POST   /orgs/[orgId]/projects/[projectId]/work-sessions/[sessionId]/resume
       → Resume paused session

POST   /orgs/[orgId]/projects/[projectId]/work-sessions/[sessionId]/stop
       → Stop session & create work log
       → Returns: { session, workLog }
```

### React Hooks

```typescript
import {
  useActiveWorkSession,
  useStartWorkSession,
  usePauseWorkSession,
  useResumeWorkSession,
  useStopWorkSession,
} from '@/hooks/work-logs/useWorkSessions';

// Fetch active session
const { data: sessionData } = useActiveWorkSession(orgId, projectId);

// Start work
const startSession = useStartWorkSession(orgId, projectId);
startSession.mutate(taskId);

// Pause work
const pauseSession = usePauseWorkSession(orgId, projectId);
pauseSession.mutate(sessionId);

// Resume work
const resumeSession = useResumeWorkSession(orgId, projectId);
resumeSession.mutate(sessionId);

// Stop and create work log
const stopSession = useStopWorkSession(orgId, projectId);
stopSession.mutate(sessionId);
```

## Troubleshooting

### Session doesn't appear
- Check you're on the correct project
- Refresh the page (Ctrl+R)
- Verify you have access to the project

### Can't start session
- Do you already have an active session in this project?
- Try stopping the existing session first
- Check task belongs to the project

### Timer not updating
- Work sessions refresh every 2 seconds
- If paused, timer should be frozen
- If active, timer updates each second

### Work log not created
- Make sure you clicked "Stop" (not closed page)
- Check the work logs page to see if it was created
- Try stopping again if session appears stuck

## Tips & Best Practices

1. **Start at task begin**: Don't estimate time, start the session when you begin
2. **Pause for breaks**: Use pause for coffee breaks, not resume for continued work
3. **One task focus**: Don't context-switch within same project
4. **Review logs weekly**: Check work logs to identify time sinks
5. **Estimate vs. actual**: Compare initial estimates with logged time

## Keyboard Shortcuts
Coming soon...

## Mobile Support
Mobile-optimized version coming soon...
