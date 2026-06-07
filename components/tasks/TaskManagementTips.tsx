'use client';

import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function TaskManagementTips() {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 mb-2">Quick Task Creation Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li><strong>⚡ Quick Add (Ctrl+Shift+T)</strong> — Fast entry with auto-remembered fields</li>
            <li><strong>📋 Full Create</strong> — Detailed form for deadlines, descriptions, and parent tasks</li>
            <li><strong>🔄 Remember Last Values</strong> — Type, Priority, and Assignee auto-fill from your last task</li>
            <li><strong>📌 Inline Quick Add</strong> — Add tasks directly at the bottom without opening dialogs</li>
            <li><strong>📚 Task Templates</strong> — Save common configurations like "Bug Report" or "Feature Task"</li>
          </ul>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsDismissed(true)}
          className="flex-shrink-0 h-6 w-6 p-0"
        >
          ✕
        </Button>
      </div>
    </div>
  );
}
