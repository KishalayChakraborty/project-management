import { LayoutDashboard, Building2, ListTodo, ClipboardList, Clock } from 'lucide-react';

export const homeNavItems = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { title: 'Organizations', icon: Building2, href: '/organizations' },
  { title: 'My Tasks', icon: ClipboardList, href: '/my-tasks' },
  { title: 'All Tasks', icon: ListTodo, href: '/all-tasks' },
  { title: 'My Work Logs', icon: Clock, href: '/my-worklog' },
  { title: 'All Work Logs', icon: Clock, href: '/all-worklog' },
];
