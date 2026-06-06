'use client';

import { WorkSession } from '@/hooks/work-logs/useWorkSessions';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface WorkSessionBadgeProps {
  session: WorkSession | null;
  taskId: string;
}

export function WorkSessionBadge({ session, taskId }: WorkSessionBadgeProps) {
  if (!session || session.taskId !== taskId) {
    return null;
  }

  return (
    <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs gap-1">
      <Clock className="h-3 w-3" />
      Active
    </Badge>
  );
}
