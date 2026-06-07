'use client';

import { useState } from 'react';
import { useTaskTemplates } from '@/hooks/tasks/useTaskTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, BookmarkPlus } from 'lucide-react';

interface TaskTemplateManagerProps {
  projectId: string;
  currentType: string;
  currentPriority: string;
  currentAssignee: string | null;
  onApplyTemplate: (template: any) => void;
}

export function TaskTemplateManager({
  projectId,
  currentType,
  currentPriority,
  currentAssignee,
  onApplyTemplate,
}: TaskTemplateManagerProps) {
  const { templates, saveTemplate, deleteTemplate } = useTaskTemplates(projectId);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const { toast } = useToast();

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: 'Error',
        description: 'Template name is required',
        variant: 'destructive',
      });
      return;
    }

    saveTemplate(templateName, {
      type: currentType as any,
      priority: currentPriority as any,
      assigneeUserId: currentAssignee,
    });

    toast({
      title: 'Success',
      description: `Template "${templateName}" saved`,
    });

    setTemplateName('');
    setShowSaveDialog(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowSaveDialog(true)}
          className="gap-2"
        >
          <BookmarkPlus className="h-4 w-4" />
          Save Template
        </Button>
      </div>

      {templates.length > 0 && (
        <div className="space-y-2 border-t pt-2">
          <p className="text-sm font-medium text-muted-foreground">Saved Templates</p>
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-2 rounded border hover:bg-accent cursor-pointer group"
            >
              <button
                onClick={() => onApplyTemplate(template)}
                className="flex-1 text-left text-sm"
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-xs text-muted-foreground">
                  {template.type} • {template.priority}
                </div>
              </button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  deleteTemplate(template.id);
                  toast({
                    title: 'Success',
                    description: 'Template deleted',
                  });
                }}
                className="opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save current configuration as a template for quick reuse
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Template name (e.g., 'Bug Report', 'Feature Task')"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTemplate}
                className="flex-1"
              >
                Save Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
