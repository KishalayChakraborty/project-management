# Work Log & Work Session Implementation

## Overview
This document summarizes the implementation of work session tracking functionality, allowing users to start, pause, resume, and stop work sessions on tasks, with automatic conversion to work logs.

## What Was Implemented

### 1. Database Schema Updates (`prisma/schema.prisma`)

#### New Enum
- `WorkSessionStatus`: `ACTIVE | PAUSED | COMPLETED`

#### New Models
- **WorkSession**: Tracks active work sessions
  - `id`: UUID
  - `orgId`, `projectId`, `taskId`, `userId`: Foreign keys
  - `startDt`: Session start timestamp
  - `completedDt`: Optional completion timestamp
  - `totalDurationMin`: Accumulated work minutes
  - `status`: Current session state
  - `segments`: Related WorkSessionSegment records
  - Constraint: Only one ACTIVE/PAUSED session per user per project

- **WorkSessionSegment**: Individual time intervals within a session
  - `id`: UUID
  - `sessionId`: Foreign key to WorkSession
  - `startDt`, `endDt`: Time interval
  - `durationMin`: Calculated duration
  - Tracks pause/resume cycles

#### Model Relationships Updated
- `User`: Added `workSessions` relation
- `Organization`: Added `workSessions` relation
- `Project`: Added `workSessions` relation
- `Task`: Added `workSessions` relation

### 2. Database Migration
File: `prisma/migrations/20260606_add_work_sessions/migration.sql`
- Creates `work_sessions` and `work_session_segments` tables
- Sets up proper indexing on `orgId`, `projectId`, `userId`, `status`
- Unique constraint on (projectId, userId, status) for active sessions
- Foreign key relationships with cascading deletes

### 3. API Routes

#### `POST /orgs/[orgId]/projects/[projectId]/work-sessions`
- **GET**: Retrieve active work session for current user in project
- **POST**: Start a new work session
  - Validates task exists in project
  - Prevents multiple active sessions per user per project
  - Creates first segment with current timestamp
  - Returns: `{ session: WorkSession }`

#### `POST /orgs/[orgId]/projects/[projectId]/work-sessions/[sessionId]/pause`
- Pauses an active session
- Closes current segment, calculates duration
- Updates session status to PAUSED
- Calculates total accumulated time

#### `POST /orgs/[orgId]/projects/[projectId]/work-sessions/[sessionId]/resume`
- Resumes a paused session
- Creates new segment with current timestamp
- Updates session status back to ACTIVE

#### `POST /orgs/[orgId]/projects/[projectId]/work-sessions/[sessionId]/stop`
- Completes a work session
- Closes current segment if active
- Converts all segments to a WorkLog record
- Creates WorkLogSegments for each pause/resume cycle
- Marks session as COMPLETED
- Returns: `{ session: WorkSession, workLog: WorkLog }`

All routes include:
- Authentication checks
- Project access validation
- User authorization (can only manage own sessions)
- Error handling for constraint violations

### 4. React Hooks (`hooks/work-logs/useWorkSessions.ts`)

#### `useActiveWorkSession(orgId, projectId)`
- Fetches active work session for current user
- Auto-refetches every 2 seconds for real-time updates
- Returns: `{ session: WorkSession | null }`

#### `useStartWorkSession(orgId, projectId)`
- Mutation to start new session with taskId
- Auto-invalidates active session query on success
- Handles conflict when user already has active session

#### `usePauseWorkSession(orgId, projectId)`
- Mutation to pause current session
- Updates UI in real-time

#### `useResumeWorkSession(orgId, projectId)`
- Mutation to resume paused session
- Timer continues from pause point

#### `useStopWorkSession(orgId, projectId)`
- Mutation to complete session and create work log
- Invalidates both work session and work log queries
- Triggers data refresh across app

### 5. UI Components

#### `components/work-logs/WorkSessionWidget.tsx`
- Displays active work session information
- Shows task title and current session status (ACTIVE/PAUSED/COMPLETED)
- Real-time timer showing accumulated time
  - Updates every second
  - Calculates from segments + current elapsed time
- Contextual action buttons:
  - When ACTIVE: "Pause" and "Stop" buttons
  - When PAUSED: "Resume" and "Stop" buttons
  - Disabled state during pending operations
- Color-coded status badge

#### `components/work-logs/WorkSessionBadge.tsx`
- Compact badge showing when task has active session
- Displays "Active" status with clock icon
- Can be integrated into task list items

### 6. Integration with Task Detail Page
File: `app/(main)/orgs/[orgId]/my-work/[projectId]/tasks/[taskId]/page.tsx`

#### Added Features:
1. **Work Session Hook Integration**
   - `useActiveWorkSession`: Fetch current session
   - Session control mutations (start, pause, resume, stop)

2. **Start Work Session Button**
   - Displays only if no active session for this task
   - Disabled if user has active session on different task
   - Clear UX messaging

3. **Session Widget in Sidebar**
   - Shows active session widget if work is in progress
   - Provides pause/resume/stop controls
   - Real-time timer display

4. **Automatic Work Log Integration**
   - When session stops, work log is created
   - Segments from pause/resume cycles tracked
   - Total duration calculated

## Business Logic Enforcement

### Single Active Session Per Project
- Database constraint: `UNIQUE (projectId, userId, status)` for ACTIVE/PAUSED
- API validation: Rejects start request if active session exists
- User feedback: Button disabled with explanation

### Multiple Projects Support
- Constraint is per-project, not org-wide
- User can work on multiple projects simultaneously
- User can work across different orgs

### Session to Work Log Conversion
- When session is stopped:
  1. All segments are finalized
  2. WorkLog is created with aggregated duration
  3. WorkLogSegments created from session segments
  4. Session marked as COMPLETED with completedDt timestamp

## Data Flow

```
1. User starts work session on Task
   → Creates WorkSession + first WorkSessionSegment (startDt only)
   → UI shows timer with status ACTIVE

2. User pauses session
   → Finalize current segment (add endDt, calculate duration)
   → Session status → PAUSED
   → Timer frozen at accumulated time

3. User resumes session
   → Create new segment (startDt only)
   → Session status → ACTIVE
   → Timer continues

4. User stops session
   → Finalize current segment
   → Create WorkLog with all segments
   → Session status → COMPLETED
   → Delete timer widget, show in work logs list
```

## Validation & Error Handling

✅ User can only manage their own sessions
✅ User cannot start session on task not in project
✅ User cannot have 2 active sessions in same project
✅ Proper error messages returned
✅ Pending states prevent duplicate requests
✅ Session segments properly closed on completion

## Real-Time Updates

- Work session widget refetches every 2 seconds
- Timer updates every 1 second with local calculation
- Work log query invalidated on session completion
- My Tasks query can be refreshed manually

## Next Steps / Future Enhancements

1. **Automatic Status Sync**: When session becomes active, auto-set task to IN_PROGRESS
2. **Session History**: Show list of recent sessions per task
3. **Time Entry Editing**: Allow manual edits to session duration
4. **Break Tracking**: Track break time separately from work time
5. **Project-wide Analytics**: Dashboard showing work time by user/task
6. **Export**: Export work logs to CSV/PDF for billing/reporting
7. **Notifications**: Alert when session duration reaches milestone
8. **Mobile Support**: Responsive work session widget on mobile

## Files Created/Modified

### Created
- `/app/api/orgs/[orgId]/projects/[projectId]/work-sessions/route.ts`
- `/app/api/orgs/[orgId]/projects/[projectId]/work-sessions/[sessionId]/pause/route.ts`
- `/app/api/orgs/[orgId]/projects/[projectId]/work-sessions/[sessionId]/resume/route.ts`
- `/app/api/orgs/[orgId]/projects/[projectId]/work-sessions/[sessionId]/stop/route.ts`
- `/hooks/work-logs/useWorkSessions.ts`
- `/components/work-logs/WorkSessionWidget.tsx`
- `/components/work-logs/WorkSessionBadge.tsx`
- `/prisma/migrations/20260606_add_work_sessions/migration.sql`

### Modified
- `prisma/schema.prisma` (added enum, models, relationships)
- `/app/(main)/orgs/[orgId]/my-work/[projectId]/tasks/[taskId]/page.tsx` (integrated work session UI)

## Testing Checklist

- [ ] Database migration applies successfully
- [ ] User can start work session on task
- [ ] Error when trying to start session on second task (same project)
- [ ] User can pause and resume session
- [ ] Timer continues accurately after resume
- [ ] Session stop creates work log with correct duration
- [ ] Work log segments match session segments
- [ ] User can work on different projects simultaneously
- [ ] Sessions persist across browser refresh
- [ ] UI properly handles loading/error states
- [ ] Authorization checks prevent cross-user access
