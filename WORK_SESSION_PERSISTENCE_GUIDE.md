# Work Session Persistence & Data Storage Guide

## Overview

Work sessions are fully persistent and track all timing details at the database level. This guide explains how data is stored, what happens during various scenarios, and how to use the system.

---

## Data Storage Details

### What Gets Saved in the Database

Every work session tracks:

#### 1. **WorkSession Table**
- `id` - Unique session ID
- `orgId` - Organization
- `projectId` - Project
- `taskId` - Task being worked on
- `userId` - User working
- `startDt` - Session start timestamp
- `completedDt` - Session completion timestamp (null if active)
- `totalDurationMin` - Total accumulated minutes
- `status` - ACTIVE, PAUSED, or COMPLETED
- `createdAt` - When session was created

#### 2. **WorkSessionSegment Table**
Each pause/resume cycle creates a segment:
- `id` - Unique segment ID
- `sessionId` - Reference to work session
- `startDt` - When this segment started
- `endDt` - When this segment ended (null if still running)
- `durationMin` - Calculated duration in minutes
- `createdAt` - When segment was created

### Example Data Flow

```
User starts work at 10:00 AM
  ↓ Creates:
  WorkSession: id=sess1, startDt=10:00, status=ACTIVE
  WorkSessionSegment: id=seg1, sessionId=sess1, startDt=10:00, endDt=null

User pauses at 10:30 AM
  ↓ Updates:
  WorkSessionSegment seg1: endDt=10:30, durationMin=30
  WorkSession sess1: totalDurationMin=30, status=PAUSED

User resumes at 10:40 AM
  ↓ Creates:
  WorkSessionSegment: id=seg2, sessionId=sess1, startDt=10:40, endDt=null
  WorkSession sess1: status=ACTIVE

User pauses at 11:10 AM
  ↓ Updates:
  WorkSessionSegment seg2: endDt=11:10, durationMin=30
  WorkSession sess1: totalDurationMin=60, status=PAUSED

User stops at 12:00 PM
  ↓ Creates:
  WorkLog: totalDurationMin=90, status=COMPLETED
  WorkLogSegment 1: startDt=10:00, endDt=10:30, durationMin=30
  WorkLogSegment 2: startDt=10:40, endDt=11:10, durationMin=30
  Etc...
```

---

## Browser Reload / Session Persistence

### What Happens When User Reloads Page

**Scenario**: User is in the middle of a work session and presses F5 or closes the browser

**Result**: ✅ Session continues seamlessly

**How It Works**:
1. Session data is stored in the **database**, not browser memory
2. When page reloads, the app fetches the active session from database
3. Timer resumes from the last recorded time
4. User can immediately continue pause/resume/stop

**Example**:
```
10:00 AM - Start session (saved to DB)
10:15 AM - User reloads page (session still in DB)
10:16 AM - App fetches session, shows timer with 16 minutes
          (calculated from startDt + any pause times)
10:30 AM - User pauses (updates in DB)
```

---

## Internet Connection Loss

### What Happens If Internet Drops

**Scenario**: User loses internet while work session is active

**Phase 1 - While Offline:**
- Timer continues running locally (React state)
- Pause/Resume buttons won't work (can't reach server)
- No data is sent to database
- **Nothing is lost** - session still exists in DB

**Phase 2 - When Connection Restores:**
- App automatically re-connects to server
- Previous session status is fetched from database
- Timer is updated to match database state
- User can resume normal operations

**Example**:
```
10:00 AM - Start session (saved to DB)
10:15 AM - Internet drops
10:15-10:25 AM - User sees local timer continue
              - Pause button won't work (no network)
10:25 AM - Internet comes back
10:26 AM - App syncs with server
          - Fetches latest session from DB
          - Updates timer
          - User can pause/resume again
```

---

## Logout / Login Scenario

### What Happens When User Logs Out During Session

**Scenario**: User is working and clicks "Sign Out"

**Result**: ✅ Session is preserved and can be resumed

**How It Works**:

1. **Session Data in Database**: 
   - Work session remains in database
   - Status is still ACTIVE or PAUSED
   - All timing data preserved

2. **When User Logs In Again**:
   - They can navigate back to the task
   - Active session is fetched from database
   - They can pause/resume/stop
   - Work log created when stopped

**Example**:
```
Morning:
10:00 AM - User starts work session
10:30 AM - User logs out (session still in DB with 30min)

Afternoon:
2:00 PM - Same user logs in
2:05 PM - Navigates to task detail page
2:06 PM - Sees active session with 30+ minutes
2:15 PM - Stops session, creates work log
```

---

## Display Features

### Task Detail Page Shows

✅ **Time Summary Card**
- Total work time on task (sum of all work logs)
- Current session time (if session is active)

✅ **Work Log Details Table**
- Date of work log
- Time work log was created
- Total duration
- Number of segments

✅ **Expandable Segment Details**
For each work log, you can see:
- Segment #1: Start time → End time (Duration)
- Segment #2: Start time → End time (Duration)
- Segment #3: Start time → End time (Duration)
- etc.

**Example Display**:
```
Time Summary
┌──────────────────────────────┐
│ Total Work Time: 5h 30m      │
│ Current Session: 45m         │
└──────────────────────────────┘

Work Log Details (3 logs)
┌──────────────────────────────────────────────────┐
│ Date: 6/6/2026 | Time: 10:00 AM | Total: 2h 15m │
│ Segments: 3                                       │
│                                                  │
│ #1: 10:00 AM → 10:45 AM (45m)                  │
│ #2: 11:00 AM → 12:00 PM (60m)                  │
│ #3: 1:00 PM → 1:30 PM (30m)                    │
└──────────────────────────────────────────────────┘
```

---

## Session Constraints

### One Active Session Per Project

**Rule**: User can only have **one** active session per project at a time

**Why**: Prevents ambiguous time tracking across multiple tasks

**How It's Enforced**:
1. Database constraint: Partial unique index on (projectId, userId) WHERE status='ACTIVE'
2. API validation: Rejects start requests if active session exists
3. UI feedback: Button disabled with message

**What You Can Do**:
- ✅ Stop current session, then start another
- ✅ Work on different projects simultaneously
- ✅ Work across different organizations

**Example**:
```
Project A - Active session on Task 1 ✓
Project B - Active session on Task 2 ✓
Project A - Try to start Task 3 ✗ (already have active in Project A)
        → Must stop Task 1 session first
```

---

## Session Timeline Example

### Complete Work Day Scenario

```
8:00 AM
├─ Start session on "Design Homepage"
├─ Timer: 00:00:00

9:30 AM (1h 30m elapsed)
├─ Pause for meeting
├─ Database saved: Segment #1 (8:00 - 9:30, 90m)

9:45 AM
├─ Resume work
├─ Timer continues from 90m

10:00 AM (90m + 15m = 105m)
├─ Computer sleeps / Network drops
├─ Session still in database

10:15 AM
├─ Resume computer / Connection restored
├─ Session fetches from DB with 105m+ current elapsed

11:00 AM (1h 15m additional = 135m total)
├─ Pause for lunch
├─ Database saved: Segment #2 (9:45 - 11:00, 75m)

12:30 PM
├─ Resume after lunch
├─ Timer continues from 165m

1:00 PM (165m + 30m = 195m)
├─ Pause for another meeting

2:00 PM
├─ Resume work

4:00 PM (2h additional = 315m total)
├─ STOP SESSION
├─ Work log created with:
│  - Total: 5h 15m (315 minutes)
│  - Segment 1: 8:00 - 9:30 (90m)
│  - Segment 2: 9:45 - 11:00 (75m)
│  - Segment 3: 12:30 - 1:00 (30m)
│  - Segment 4: 2:00 - 4:00 (120m)
│
└─ All data stored permanently in database
```

---

## What Gets Lost vs. Preserved

### Lost (Local, Not Persisted)
- ❌ Browser local storage (cleared on logout)
- ❌ Browser session cache
- ❌ Unsaved form data

### Preserved (Database, Persistent)
- ✅ Work session status
- ✅ All timing data (start, end, pause times)
- ✅ Session segments with millisecond accuracy
- ✅ Converted work logs
- ✅ User information

---

## Recovery Procedures

### If Session Appears Stuck

**Problem**: Session shows but buttons don't work

**Solution**:
1. Refresh page (F5)
2. Check internet connection
3. Log out and log in again
4. Navigate to task detail page

### If Session Data Missing

**Problem**: Started session but don't see it on page reload

**Solution**:
1. Check if you're on correct task/project
2. Try navigation: My Tasks → Task → Session should appear
3. Check Work Logs page to see if it was already completed
4. Contact support if data is truly missing

### If Unable to Stop Session

**Problem**: Stop button not responding

**Solution**:
1. Check internet connection
2. Try again after 5 seconds
3. Try pause first, then stop
4. Refresh page and try again

---

## Backup & Data Safety

### Data Persistence Guarantees

- ✅ All work session data backed by PostgreSQL database
- ✅ All pauses/resumes logged as separate segments
- ✅ Automatic conversion to work logs with full segment data
- ✅ No data loss on browser close/logout/disconnect
- ✅ Timestamps accurate to millisecond level
- ✅ Replicated database backups

### Data Retention

- Work sessions: Kept until explicitly stopped
- Work logs: Permanent (linked to task)
- Session segments: Archived with work log
- Timeframe: Forever (until account deletion)

---

## Technical Details for Developers

### Session Fetch Strategy

```javascript
// Every page load and every 2 seconds
useActiveWorkSession(orgId, projectId)
  ↓
GET /orgs/{orgId}/projects/{projectId}/work-sessions
  ↓
Returns: { session: WorkSession | null }
  ↓
If found: Resume from lastSegment.startDt + elapsed time
If not found: No active session, fresh start
```

### Timer Calculation

```javascript
// Real-time, updates every 1 second
totalTime = session.totalDurationMin * 60 * 1000 // Previous segments
          + (Date.now() - lastSegment.startDt) // Current segment

displayTime = formatDuration(totalTime)
```

### Segment Storage

```sql
-- When pausing
UPDATE work_session_segments
SET end_dt = NOW(),
    duration_min = EXTRACT(EPOCH FROM (NOW() - start_dt)) / 60
WHERE id = currentSegmentId;

-- When resuming
INSERT INTO work_session_segments (session_id, start_dt)
VALUES (sessionId, NOW());
```

---

## FAQ

**Q: Will my session be lost if I close the browser?**
A: No! Sessions are stored in the database. When you return, the session is fetched automatically.

**Q: What if my internet drops mid-session?**
A: The timer continues locally. When connection restores, it syncs with the database. No data is lost.

**Q: Can I log out and log in later to resume?**
A: Yes! The session remains in the database. Log in, navigate to the task, and you'll see your active session.

**Q: How accurate are the timestamps?**
A: Timestamps are accurate to the millisecond level, stored in UTC.

**Q: What if I click stop by accident?**
A: The work log is created immediately. The session cannot be resumed, but you can start a new one.

**Q: Can I edit a work log after creation?**
A: Currently no - work logs are created once and permanent. Start a new session if needed.

**Q: How long are sessions kept?**
A: Until you explicitly stop them (completing the work log), or indefinitely if left active.

---

## Summary

✅ **All data is persistent** - stored in database
✅ **Segments track all pauses** - start, end, duration for each
✅ **No data loss** - browser close, logout, internet drops
✅ **Accurate timing** - millisecond precision timestamps
✅ **Session recovery** - automatic sync on page reload
✅ **Multi-day sessions** - can pause overnight and resume

Your work time is safe and always recorded! 🔒
