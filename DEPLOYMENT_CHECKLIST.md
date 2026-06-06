# Work Sessions Feature - Deployment Checklist

## Pre-Deployment

### Code Review
- [x] TypeScript compilation successful (no errors)
- [x] All new files created
- [x] API routes properly structured
- [x] React hooks follow React Query patterns
- [x] UI components use existing component library
- [x] Authorization checks in place on all endpoints

### Database
- [ ] Migration file reviewed: `prisma/migrations/20260606_add_work_sessions/migration.sql`
- [ ] Migration creates tables correctly
- [ ] Indexes properly defined
- [ ] Foreign keys set with CASCADE delete
- [ ] Enum `WorkSessionStatus` created
- [ ] Unique constraint on (projectId, userId, status) in place

### Testing Environment
- [ ] Database connection established
- [ ] Prisma migration runs without errors
- [ ] Prisma client generated successfully
- [ ] API routes accessible
- [ ] React components render without errors

## Deployment Steps

### 1. Database Migration
```bash
# Run migration
npx prisma migrate deploy

# Or if using db push
npx prisma db push
```

**Verify**: Check that tables exist
```sql
SELECT * FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'work_%';
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

**Verify**: Check `app/generated/prisma` contains new types
```bash
ls -la app/generated/prisma/ | grep -i work
```

### 3. Build Application
```bash
npm run build
```

**Expected**: Build completes without errors

### 4. Start Application
```bash
npm run dev
# or
npm start
```

**Expected**: App starts, no errors related to work sessions

## Post-Deployment Testing

### Manual Testing Checklist

#### 1. Authentication & Authorization
- [ ] Log in as user
- [ ] Navigate to task detail page
- [ ] Verify "Start work session" button visible
- [ ] Try accessing work session endpoints as unauthenticated user → Should return 403
- [ ] Try accessing another user's session → Should return 403

#### 2. Start Work Session
- [ ] Click "Start work session" button
- [ ] Verify session widget appears in sidebar
- [ ] Verify timer starts from 00:00:00
- [ ] Verify status badge shows "ACTIVE"
- [ ] Verify task title displays correctly

#### 3. Single Task Per Project Constraint
- [ ] While session active, navigate to different task
- [ ] Verify "Start work session" button is disabled
- [ ] Verify tooltip shows "Working on another task"
- [ ] Try making API call to start session → Should return 409 Conflict

#### 4. Pause Session
- [ ] Click "Pause" button
- [ ] Verify timer freezes at current value
- [ ] Verify status changes to "PAUSED"
- [ ] Verify "Resume" button appears

#### 5. Resume Session
- [ ] Click "Resume" button
- [ ] Verify timer continues from paused value
- [ ] Verify status changes back to "ACTIVE"
- [ ] Verify "Pause" button reappears

#### 6. Stop Session
- [ ] Click "Stop" button
- [ ] Verify session widget disappears
- [ ] Navigate to work logs page
- [ ] Verify work log created with:
  - [x] Correct user
  - [x] Correct task
  - [x] Correct duration
  - [x] Segments showing pause/resume cycles
  - [x] Current date

#### 7. Multi-Project Sessions
- [ ] Start session in Project A
- [ ] Navigate to different project (Project B)
- [ ] Verify can start session in Project B
- [ ] Verify both sessions appear to be independent
- [ ] Stop session in Project B
- [ ] Verify can still work in Project A

#### 8. Timer Accuracy
- [ ] Start session
- [ ] Wait ~1 minute
- [ ] Pause and check duration (should be ~60 seconds)
- [ ] Resume and wait another minute
- [ ] Stop and check total duration (should be ~120 seconds)
- [ ] Verify work log matches

#### 9. Browser Refresh
- [ ] Start session
- [ ] Wait 10 seconds
- [ ] Refresh browser (Ctrl+R)
- [ ] Verify session still active
- [ ] Verify timer shows correct accumulated time
- [ ] Verify no duplicate sessions created

#### 10. Work Log Display
- [ ] Stop a session with multiple pause/resume cycles
- [ ] View work log in work-logs page
- [ ] Verify all segments display correctly
- [ ] Verify total duration is sum of all segments

#### 11. Admin Views
- [ ] As admin, visit `/orgs/[orgId]/projects/[projectId]/work-logs`
- [ ] Verify all team members' work logs visible
- [ ] Test filters: by user, date range
- [ ] Test search: by user name/email
- [ ] Test sorting: by date, duration, user

#### 12. Error Handling
- [ ] Try starting session for non-existent task → Error message
- [ ] Try pausing non-existent session → 404 error
- [ ] Try resuming active session → Error (not paused)
- [ ] Try stopping completed session → Error
- [ ] Network error during API call → Graceful error handling

### Automated Testing (Optional)

```typescript
// Example test cases
describe('Work Sessions', () => {
  it('should start a work session', async () => {
    const response = await api.post('/work-sessions', { taskId });
    expect(response.status).toBe(201);
    expect(response.data.session.status).toBe('ACTIVE');
  });

  it('should prevent duplicate active sessions', async () => {
    await api.post('/work-sessions', { taskId: task1 });
    const response = await api.post('/work-sessions', { taskId: task2 });
    expect(response.status).toBe(409);
  });

  it('should create work log on stop', async () => {
    const session = await api.post('/work-sessions', { taskId });
    await api.post(`/work-sessions/${session.id}/stop`);
    const workLogs = await api.get('/work-logs');
    expect(workLogs.data.some(log => log.taskId === taskId)).toBe(true);
  });
});
```

## Performance Monitoring

### Query Performance
- [ ] Work session queries: < 100ms
- [ ] Work log creation: < 500ms
- [ ] Session list fetch: < 200ms

### Resource Usage
- [ ] Timer doesn't cause memory leaks
- [ ] Refetch interval (2s) doesn't cause excessive load
- [ ] Database indexes used correctly

### Error Rates
- [ ] Monitor API error rates for work session endpoints
- [ ] Check for failed migrations in database logs
- [ ] Monitor React query errors in browser console

## Rollback Plan

If deployment fails or issues arise:

### Rollback Database
```bash
# Revert migration (if needed)
npx prisma migrate resolve --rolled-back 20260606_add_work_sessions
```

### Rollback Code
- Revert commits containing work session changes
- Redeploy previous stable version
- Notify users of temporary feature unavailability

### Rollback Work Logs
- Work logs created remain intact
- Previous work logs unaffected
- Work sessions marked as COMPLETED persist for record keeping

## Monitoring Post-Deployment

### Daily
- [ ] Check error logs for work session errors
- [ ] Verify timer accuracy (spot check)
- [ ] Monitor API response times

### Weekly
- [ ] Review work log statistics
  - Total work sessions created
  - Average session duration
  - Users actively tracking time
- [ ] Check for data anomalies
- [ ] Gather user feedback

### Monthly
- [ ] Performance analysis
- [ ] Usage trends
- [ ] Plan future enhancements

## Success Criteria

✅ All API endpoints functional
✅ Work sessions CRUD operations complete
✅ Sessions convert to work logs correctly
✅ Authorization checks prevent unauthorized access
✅ Single session per project constraint enforced
✅ Multi-project sessions work independently
✅ UI components render correctly
✅ Timer updates in real-time
✅ Database migration applies cleanly
✅ No performance regressions
✅ Error handling graceful
✅ User feedback positive

## Known Limitations

- Sessions must be started in real-time (no backdating)
- Cannot edit session duration after creation
- Pause/resume cycles tracked as segments (cannot merge)
- Maximum session duration: unlimited (but database practical limits apply)
- No automatic session timeout (user must manually stop)

## Future Enhancements

1. **Session Templates**: Pre-set durations for common tasks
2. **Automatic Timeout**: Stop session after X minutes of inactivity
3. **Idle Detection**: Pause when computer locked
4. **Bulk Operations**: Stop multiple sessions at once
5. **Time Corrections**: Edit session duration post-hoc
6. **Integrations**: Export to calendar/billing system
7. **Notifications**: Alert when reaching time threshold
8. **Analytics**: Dashboard of work time trends

## Documentation

- [x] Implementation guide: `WORK_SESSION_IMPLEMENTATION.md`
- [x] User guide: `WORK_SESSIONS_QUICK_START.md`
- [x] Deployment checklist: This file
- [ ] API documentation: (Create if needed)
- [ ] Video walkthrough: (Optional)

## Sign-Off

- [ ] Developer: Code review complete
- [ ] QA: Testing complete and passed
- [ ] DevOps: Database migration verified
- [ ] Product: Feature meets requirements
- [ ] Deployed: Production deployment complete

**Deployment Date**: ___________
**Deployed By**: ___________
**Notes**: ___________
