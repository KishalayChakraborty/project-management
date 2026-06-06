# Floating Comments Feature Guide

## Overview

The floating comment system allows you to open and manage multiple comment boxes simultaneously across all pages of the application. This enables seamless collaboration and discussion without navigating away from your current work.

## Features

### 1. **Global Floating Comment Panel**
- Access via the floating message icon (💬) in the bottom-right corner
- Persistent across all pages in the application
- Works on desktop and maintains position state

### 2. **Task Selection**
- **Step 1:** Select an Organization
- **Step 2:** Select a Project within that organization
- **Step 3:** Search for and select a Task
- Multiple comment boxes can be opened simultaneously

### 3. **Comment Management**
Each floating comment box includes:
- **Task information** at the top (shows task title)
- **Search comments** - Filter comments within the box
- **Comment list** - View all comments with user avatars and timestamps
- **Comment input** - Add new comments instantly
- **Delete option** - Remove your own comments
- **Drag to move** - Click and drag the header to reposition
- **Minimize/Maximize** - Collapse boxes to save space
- **Close** - Remove individual boxes

### 4. **Direct Task Page Access**
From any task detail page:
- Click the **"Comments"** button in the top action bar
- Opens a floating comment box for that specific task
- Can be used alongside the task detail view

### 5. **Multiple Boxes**
- Open as many comment boxes as you need
- Each box is independent with its own state
- See counts and close all at once with "Close All" button
- Boxes persist until you close them

## How to Use

### Opening Comments from Task Page

1. Navigate to any task detail page
2. Click the "Comments" button at the top
3. A floating comment box opens in the bottom-right area
4. You can continue viewing the task details while commenting

### Opening Comments from Floating Panel

1. Click the floating message icon (💬) in the bottom-right
2. A popup appears with selections:
   - **Organization**: Choose your org
   - **Project**: Select from available projects
   - **Task**: Search and select the task
3. The comment box opens automatically
4. Repeat to open additional comment boxes

### Searching Comments

Within each floating box:
1. Use the search field at the top to filter comments
2. Search is case-insensitive and matches comment content
3. Results update instantly

### Managing Multiple Boxes

- **Moving boxes**: Click and drag the header bar to reposition
- **Minimizing**: Click the minimize icon to collapse a box (saves space)
- **Maximizing**: Click the maximize icon to expand a collapsed box
- **Closing individual box**: Click the X button
- **Close all boxes**: Click "Close All (N)" button (only shown when boxes are open)

## Technical Details

### File Structure

- **Hook**: `hooks/useFloatingComments.ts` - State management using Zustand
- **Hook**: `hooks/useOpenFloatingComment.ts` - Convenience hook for opening boxes
- **Component**: `components/comments/FloatingCommentBox.tsx` - Individual comment box
- **Component**: `components/comments/FloatingCommentPanel.tsx` - Main panel and task selector
- **Integration**: `app/(main)/layout.tsx` - Added to main layout
- **Task Page**: `app/(main)/orgs/[orgId]/my-work/[projectId]/tasks/[taskId]/page.tsx` - Quick access button

### State Persistence

- Comment boxes are persisted to browser localStorage
- Position and minimized state are saved
- State reloads when you return to the application

### API Endpoints Used

- `GET /orgs/:orgId/projects/:projectId/tasks/:taskId/comments` - Fetch comments
- `POST /orgs/:orgId/projects/:projectId/tasks/:taskId/comments` - Add comment
- `DELETE /orgs/:orgId/projects/:projectId/tasks/:taskId/comments/:commentId` - Delete comment

## Tips & Tricks

1. **Quick Access**: Keep commonly discussed tasks open as floating boxes
2. **Compare Tasks**: Open comment boxes for multiple related tasks side-by-side
3. **Organize Layout**: Arrange boxes on screen to suit your workflow
4. **Minimize When Not Needed**: Collapse boxes to focus on specific areas
5. **Search Across Tasks**: Use the global selector to quickly find and open any task

## Keyboard Support

- Currently supports standard form interactions
- Future enhancement could add keyboard shortcuts (e.g., Ctrl+Shift+C to open panel)

## Browser Compatibility

- Works on all modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design adapts to different screen sizes
- Touch-friendly on tablets (though primary use case is desktop)

## Future Enhancements

Potential improvements:
- Keyboard shortcuts for quick access
- Comment notifications when others comment
- Collaborative features (real-time collaboration)
- Comment threads/replies
- Advanced search and filtering
- Dark mode support for comment boxes
- Sound notifications for new comments
