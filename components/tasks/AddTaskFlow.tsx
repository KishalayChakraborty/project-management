'use client';

import { useState, useEffect } from 'react';
import { useOrganizations } from '@/hooks/organization';
import { useOrganizationProjects } from '@/hooks/organization';
import { CreateTaskDialog } from './CreateTaskDialog';
import { useTasks } from '@/hooks/tasks/useTasks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loading } from '@/components/ui/loading';

interface AddTaskFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select an org (skips org step) */
  defaultOrgId?: string;
  /** Pre-select a project (skips org + project steps) */
  defaultProjectId?: string;
}

export function AddTaskFlow({ open, onOpenChange, defaultOrgId, defaultProjectId }: AddTaskFlowProps) {
  const [selectedOrgId, setSelectedOrgId] = useState<string>(defaultOrgId ?? '');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(defaultProjectId ?? '');
  const [showCreate, setShowCreate] = useState(false);

  // Sync whenever the dialog opens or its defaults change
  useEffect(() => {
    if (open) {
      setSelectedOrgId(defaultOrgId ?? '');
      setSelectedProjectId(defaultProjectId ?? '');
      setShowCreate(false);
    }
  }, [open, defaultOrgId, defaultProjectId]);

  const { data: orgs = [], isLoading: orgsLoading } = useOrganizations();
  const { data: projectsData, isLoading: projectsLoading } = useOrganizationProjects(
    selectedOrgId || null
  );
  const { data: tasksData } = useTasks(selectedOrgId || null, selectedProjectId || null);

  const projects = projectsData?.projects ?? [];
  const projectTasks = tasksData?.tasks?.map((t) => ({ id: t.id, title: t.title })) ?? [];

  function handleProceed() {
    if (selectedOrgId && selectedProjectId) {
      setShowCreate(true);
    }
  }

  function handleClose() {
    setSelectedOrgId(defaultOrgId ?? '');
    setSelectedProjectId(defaultProjectId ?? '');
    setShowCreate(false);
    onOpenChange(false);
  }

  if ((showCreate || (defaultOrgId && defaultProjectId)) && selectedOrgId && selectedProjectId) {
    return (
      <CreateTaskDialog
        open
        onOpenChange={(o) => { if (!o) handleClose(); }}
        orgId={selectedOrgId}
        projectId={selectedProjectId}
        projectTasks={projectTasks}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Organisation</Label>
            {orgsLoading ? (
              <Loading text="Loading…" />
            ) : (
              <Select
                value={selectedOrgId}
                onValueChange={(v) => { setSelectedOrgId(v); setSelectedProjectId(''); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organisation…" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Project</Label>
            {selectedOrgId && projectsLoading ? (
              <Loading text="Loading projects…" />
            ) : (
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                disabled={!selectedOrgId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedOrgId ? 'Select project…' : 'Select an org first'} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span>{p.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{p.code}</span>
                    </SelectItem>
                  ))}
                  {projects.length === 0 && selectedOrgId && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No projects found</div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleProceed} disabled={!selectedOrgId || !selectedProjectId}>
            Next →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
