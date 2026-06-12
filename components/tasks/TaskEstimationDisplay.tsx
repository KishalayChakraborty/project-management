'use client';

import { formatEstimatedTime, formatCost } from '@/lib/task-utils';
import { Card } from '@/components/ui/card';
import { Clock, DollarSign, Package } from 'lucide-react';

interface TaskEstimationDisplayProps {
  estimatedMonths?: number | null;
  estimatedDays?: number | null;
  estimatedHours?: number | null;
  estimatedMinutes?: number | null;
  costOfExecution?: number | null;
  resourceNeeds?: Record<string, unknown> | null;
  compact?: boolean;
}

export function TaskEstimationDisplay({
  estimatedMonths,
  estimatedDays,
  estimatedHours,
  estimatedMinutes,
  costOfExecution,
  resourceNeeds,
  compact = false,
}: TaskEstimationDisplayProps) {
  const hasEstimation = estimatedMonths || estimatedDays || estimatedHours || estimatedMinutes;
  const hasData = hasEstimation || costOfExecution || resourceNeeds;

  if (!hasData) return null;

  const estimatedTime = formatEstimatedTime({
    months: estimatedMonths ?? undefined,
    days: estimatedDays ?? undefined,
    hours: estimatedHours ?? undefined,
    minutes: estimatedMinutes ?? undefined,
  });

  if (compact) {
    return (
      <div className="flex gap-3 flex-wrap text-sm">
        {hasEstimation && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
            <Clock className="w-4 h-4" />
            <span>{estimatedTime}</span>
          </div>
        )}
        {costOfExecution && (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded">
            <DollarSign className="w-4 h-4" />
            <span>{formatCost(costOfExecution)}</span>
          </div>
        )}
        {resourceNeeds && (
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded">
            <Package className="w-4 h-4" />
            <span>Resources</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="space-y-3">
        {hasEstimation && (
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-700">Estimated Time</p>
              <p className="text-lg font-semibold text-slate-900">{estimatedTime}</p>
            </div>
          </div>
        )}

        {costOfExecution && (
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-700">Cost of Execution</p>
              <p className="text-lg font-semibold text-slate-900">{formatCost(costOfExecution)}</p>
            </div>
          </div>
        )}

        {resourceNeeds && (
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-700">Resource Needs</p>
              <div className="mt-2 bg-white rounded p-2 text-sm">
                {typeof resourceNeeds === 'object' ? (
                  <pre className="whitespace-pre-wrap break-words text-slate-700">
                    {JSON.stringify(resourceNeeds, null, 2)}
                  </pre>
                ) : (
                  <p className="text-slate-700">{String(resourceNeeds)}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
