'use client';

import { useState, useEffect, useRef } from 'react';
import { WorkSession } from '@/hooks/work-logs/useWorkSessions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square } from 'lucide-react';

interface WorkSessionWidgetProps {
  session: WorkSession | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  isPausePending?: boolean;
  isResumePending?: boolean;
  isStopPending?: boolean;
}

export function WorkSessionWidget({
  session,
  onPause,
  onResume,
  onStop,
  isPausePending = false,
  isResumePending = false,
  isStopPending = false,
}: WorkSessionWidgetProps) {
  const [displayTime, setDisplayTime] = useState<string>('00:00:00');
  const clientServerOffsetRef = useRef<number | null>(null);

  // Calculate client-server time offset when session becomes active
  useEffect(() => {
    if (session && session.status === 'ACTIVE' && clientServerOffsetRef.current === null) {
      const lastSegment = session.segments[session.segments.length - 1];
      if (lastSegment && lastSegment.startDt) {
        const serverTime = new Date(lastSegment.startDt).getTime();
        const clientTime = Date.now();
        // Offset = how much ahead the server is compared to client
        clientServerOffsetRef.current = serverTime - clientTime;
      }
    }
    if (!session) {
      clientServerOffsetRef.current = null;
    }
  }, [session?.id, session?.status]);

  useEffect(() => {
    if (!session) return;

    const updateTime = () => {
      let totalMs = session.totalDurationMin * 60 * 1000;

      if (session.status === 'ACTIVE') {
        const lastSegment = session.segments[session.segments.length - 1];
        if (lastSegment && lastSegment.startDt && clientServerOffsetRef.current !== null) {
          const serverStartTime = new Date(lastSegment.startDt).getTime();
          const clientStartTime = serverStartTime - clientServerOffsetRef.current;
          const msElapsed = Math.max(0, Date.now() - clientStartTime);
          totalMs += msElapsed;
        }
      }

      const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setDisplayTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 500);
    return () => clearInterval(interval);
  }, [session]);

  if (!session) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Current Work Session</p>
          <p className="font-semibold text-lg">{session.task.title}</p>
        </div>
        <Badge
          variant={
            session.status === 'ACTIVE'
              ? 'default'
              : session.status === 'PAUSED'
                ? 'secondary'
                : 'outline'
          }
        >
          {session.status}
        </Badge>
      </div>

      <div className="bg-white rounded p-2 text-center">
        <p className="text-3xl font-bold font-mono text-blue-600">{displayTime}</p>
      </div>

      <div className="flex gap-2 justify-end">
        {session.status === 'ACTIVE' ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={onPause}
              disabled={isPausePending}
            >
              <Pause className="h-4 w-4 mr-1" />
              Pause
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onStop}
              disabled={isStopPending}
            >
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
          </>
        ) : session.status === 'PAUSED' ? (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={onResume}
              disabled={isResumePending}
            >
              <Play className="h-4 w-4 mr-1" />
              Resume
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onStop}
              disabled={isStopPending}
            >
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
